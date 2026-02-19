/**
 * RBAC middleware for organization-scoped routes.
 * Wraps API handlers with org membership + role verification.
 */

import { NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api-middleware';
import { getAdminDb } from '@/lib/firebase/admin';
import type { OrgRole } from '@/types';

export interface OrgRouteContext extends RouteContext {
    orgId: string;
    orgRole: OrgRole;
}

type OrgHandler = (
    request: Request,
    context: OrgRouteContext
) => Promise<Record<string, unknown> | NextResponse>;

/**
 * Wraps a handler with org membership verification.
 * Reads orgId from route params.
 * Optionally requires a minimum role level.
 */
export function withOrgRole(handler: OrgHandler, requiredRole?: OrgRole) {
    return withAuth(async (request, context) => {
        const { orgId } = context.params;

        if (!orgId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

        const db = getAdminDb();

        // Check membership
        const memberDoc = await db
            .collection('orgs')
            .doc(orgId)
            .collection('members')
            .doc(context.user.uid)
            .get();

        if (!memberDoc.exists) {
            return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
        }

        const membership = memberDoc.data()!;
        const memberRole = membership.role as OrgRole;

        // Role hierarchy check
        if (requiredRole === 'admin' && memberRole !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        return handler(request, {
            ...context,
            orgId,
            orgRole: memberRole,
        });
    });
}
