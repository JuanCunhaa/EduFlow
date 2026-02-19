import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/leads — capture an email lead.
 * No auth required — this is a public endpoint for lead capture.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, certSlug, source, consent } = body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        const db = getAdminDb();

        // Basic rate limit: check if this email was captured in the last 24h
        const existingDoc = await db.collection('emailLeads').doc(normalizedEmail).get();
        if (existingDoc.exists) {
            // Already captured — silently succeed (don't reveal this to the user)
            return NextResponse.json({ ok: true });
        }

        // Store the lead
        await db.collection('emailLeads').doc(normalizedEmail).set({
            email: normalizedEmail,
            uid: null,
            source: source || 'unknown',
            tags: [
                `source:${source || 'unknown'}`,
                ...(certSlug ? [`cert:${certSlug}`] : []),
            ],
            certInterest: certSlug ? [certSlug] : [],
            consent: !!consent,
            status: 'active',
            capturedAt: FieldValue.serverTimestamp(),
            lastEmailedAt: null,
            convertedAt: null,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[leads] POST error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
