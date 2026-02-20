/**
 * GET /api/admin/studies/list
 * Returns a list of all existing marketplace studies for the admin panel.
 */

import { NextResponse } from 'next/server';
import { withAdmin, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';

export const GET = withAdmin(
    async (request: Request, { log }: RouteContext) => {
        const db = getAdminDb();

        const snap = await db
            .collection('marketplace_studies')
            .orderBy('createdAt', 'desc')
            .get();

        const studies = snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                abbreviation: data.abbreviation,
                issuer: data.issuer,
                domains: data.domains || [],
                questionCount: data.questionCount || 0,
                isActive: data.isActive,
            };
        });

        return { data: studies };
    }
);
