/**
 * POST /api/admin/import/csv
 * Imports questions from a CSV file upload into a marketplace study.
 *
 * Expected CSV columns (header row required):
 *   text, optionA, optionB, optionC, optionD, correctOption, explanation, difficulty, domain, tags
 *
 * correctOption: A | B | C | D
 * difficulty: easy | medium | hard
 * domain: any string (used as domainId)
 * tags: comma-separated inside the cell (e.g. "network,ipv4")
 *
 * Admin-only. Max 500 rows per upload.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const OPTION_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_ROWS = 500;
const BATCH_SIZE = 400;

interface ParsedRow {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
    explanation: string;
    difficulty: string;
    domain: string;
    tags: string;
}

function parseCsv(raw: string): ParsedRow[] {
    const lines = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replaceAll(/[^a-z]/g, ''));

    const requiredCols = ['text', 'optiona', 'optionb', 'optionc', 'optiond', 'correctoption'];
    for (const col of requiredCols) {
        if (!headers.includes(col)) throw new Error(`Missing required column: "${col}"`);
    }

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // RFC 4180-compatible CSV split (handles quoted fields with commas)
        const cells = splitCsvLine(line);
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? '').trim(); });

        rows.push({
            text: obj['text'] ?? '',
            optionA: obj['optiona'] ?? '',
            optionB: obj['optionb'] ?? '',
            optionC: obj['optionc'] ?? '',
            optionD: obj['optiond'] ?? '',
            correctOption: (obj['correctoption'] ?? '').toUpperCase(),
            explanation: obj['explanation'] ?? '',
            difficulty: (obj['difficulty'] ?? 'medium').toLowerCase(),
            domain: obj['domain'] ?? 'general',
            tags: obj['tags'] ?? '',
        });
    }

    return rows;
}

/** Minimal RFC-4180 CSV line parser (handles double-quoted fields). */
function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const ch = line[i];
        const isEscapedQuote = inQuotes && ch === '"' && line[i + 1] === '"';
        if (isEscapedQuote) {
            current += '"';
            i += 2;
            continue;
        }
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += ch; }
        i++;
    }
    result.push(current);
    return result;
}

export const POST = withAdmin(
    async (request: Request, { log }: RouteContext) => {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const studyId = formData.get('studyId') as string | null;

        if (!file || !studyId) {
            return NextResponse.json({ error: 'file and studyId are required' }, { status: 400 });
        }
        if (!file.name.endsWith('.csv')) {
            return NextResponse.json({ error: 'File must be a .csv' }, { status: 400 });
        }

        const db = getAdminDb();

        // Verify study exists
        const studySnap = await db.collection('marketplace_studies').doc(studyId).get();
        if (!studySnap.exists) {
            return NextResponse.json({ error: 'Study not found' }, { status: 404 });
        }

        const rawText = await file.text();
        let rows: ParsedRow[];
        try {
            rows = parseCsv(rawText);
        } catch (e) {
            return NextResponse.json({ error: (e as Error).message }, { status: 422 });
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'CSV has no valid data rows' }, { status: 422 });
        }
        if (rows.length > MAX_ROWS) {
            return NextResponse.json(
                { error: `CSV exceeds maximum of ${MAX_ROWS} rows. Got ${rows.length}.` },
                { status: 422 }
            );
        }

        // Validate & transform rows
        const valid: object[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed, +1 for header

            if (!row.text || row.text.length < 10) { errors.push(`Row ${rowNum}: text too short`); continue; }
            if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) { errors.push(`Row ${rowNum}: missing option(s)`); continue; }
            if (!(row.correctOption in OPTION_MAP)) { errors.push(`Row ${rowNum}: correctOption must be A/B/C/D`); continue; }
            if (!VALID_DIFFICULTIES.has(row.difficulty)) { row.difficulty = 'medium'; }

            valid.push({
                studyId,
                text: row.text,
                options: [
                    { label: 'A', text: row.optionA },
                    { label: 'B', text: row.optionB },
                    { label: 'C', text: row.optionC },
                    { label: 'D', text: row.optionD },
                ],
                correctOptionIndex: OPTION_MAP[row.correctOption],
                explanation: {
                    short: row.explanation || `The correct answer is ${row.correctOption}.`,
                    whyOthersWrong: {},
                    examTip: '',
                },
                difficulty: row.difficulty,
                domainIds: [row.domain.trim() || 'general'],
                tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
                isActive: true,
                source: 'csv-import',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        if (valid.length === 0) {
            return NextResponse.json({ error: 'No valid rows to import', details: errors }, { status: 422 });
        }

        // Batched Firestore writes
        let imported = 0;
        for (let i = 0; i < valid.length; i += BATCH_SIZE) {
            const chunk = valid.slice(i, i + BATCH_SIZE);
            const batch = db.batch();
            for (const q of chunk) {
                batch.set(db.collection('marketplace_questions').doc(), q);
                imported++;
            }
            batch.update(db.collection('marketplace_studies').doc(studyId), {
                questionCount: FieldValue.increment(chunk.length),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await batch.commit();
        }

        log.info('CSV import complete', { meta: { studyId, imported, skipped: errors.length } });

        return { imported, skipped: rows.length - valid.length, errors: errors.slice(0, 20) };
    }
);
