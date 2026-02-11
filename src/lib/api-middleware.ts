/**
 * API route middleware — eliminates auth/error/CSRF boilerplate.
 *
 * Usage:
 * ```ts
 * export const POST = withAuth(async (req, { user, log, params }) => {
 *   // business logic here
 *   return { data: result };
 * });
 * ```
 */

import { NextResponse } from 'next/server';
import { verifyAuth, verifyAuthStrict, type AuthUser } from '@/lib/firebase/server-auth';
import { createRequestLogger } from '@/lib/logger';
import { AppError, UnauthorizedError } from '@/lib/errors';

export type { AuthUser } from '@/lib/firebase/server-auth';

export interface RouteContext {
    user: AuthUser;
    log: ReturnType<typeof createRequestLogger>;
    params: Record<string, string>;
}

type RouteResult = Record<string, unknown> | NextResponse;

type AuthenticatedHandler = (
    request: Request,
    context: RouteContext
) => Promise<RouteResult>;

interface WithAuthOptions {
    /** If true, mutating methods require Content-Type: application/json (CSRF protection) */
    requireJsonContentType?: boolean;
    /** Maximum request body size in bytes (default: 1MB) */
    maxBodySize?: number;
    /** If true, verifies session cookie with revocation check (adds latency). Use for destructive operations. */
    checkRevoked?: boolean;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Wraps an API route handler with:
 * - Authentication (session cookie verification)
 * - CSRF protection (Content-Type check on mutating methods)
 * - Structured error handling with proper status codes
 * - Request logging with correlation IDs
 * - Consistent JSON response format
 */
export function withAuth(
    handler: AuthenticatedHandler,
    options: WithAuthOptions = {}
) {
    const { requireJsonContentType = true, maxBodySize = 1_048_576, checkRevoked = false } = options;

    return async (
        request: Request,
        routeContext?: { params?: Promise<Record<string, string>> }
    ) => {
        const log = createRequestLogger(request);

        try {
            // ── Body size enforcement ──
            // Prevents DoS via oversized payloads before any processing
            if (MUTATING_METHODS.has(request.method) && maxBodySize > 0) {
                const contentLength = request.headers.get('content-length');
                if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
                    log.warn('Request body too large', { contentLength });
                    return NextResponse.json(
                        { error: 'Request body too large' },
                        { status: 413 }
                    );
                }
            }

            // ── CSRF Protection ──
            // Mutating requests must have Content-Type: application/json
            // Browsers cannot set this header via <form> submissions
            if (
                requireJsonContentType &&
                MUTATING_METHODS.has(request.method) &&
                request.method !== 'DELETE'
            ) {
                const contentType = request.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    log.warn('CSRF: missing application/json content-type');
                    return NextResponse.json(
                        { error: 'Content-Type must be application/json' },
                        { status: 415 }
                    );
                }
            }

            // ── Authentication ──
            // Sensitive operations use checkRevoked to reject compromised sessions
            const user = checkRevoked
                ? await verifyAuthStrict()
                : await verifyAuth();
            if (!user) {
                throw new UnauthorizedError();
            }

            // Create a user-scoped logger
            const userLog = createRequestLogger(request, { userId: user.uid });

            // ── Resolve route params ──
            const params = routeContext?.params
                ? await routeContext.params
                : {};

            // ── Execute handler ──
            const result = await handler(request, { user, log: userLog, params });

            // If the handler returns a NextResponse directly, use it
            if (result instanceof NextResponse) {
                userLog.done(result.status);
                return result;
            }

            // Otherwise, wrap in standard JSON response
            const status = request.method === 'POST' ? 201 : 200;
            userLog.done(status);
            return NextResponse.json(result, { status });
        } catch (error) {
            // ── Structured error handling ──
            if (error instanceof AppError) {
                log.warn(error.message, {
                    error,
                    meta: { code: error.code, statusCode: error.statusCode },
                });
                return NextResponse.json(
                    {
                        error: error.message,
                        code: error.code,
                        ...(error.details ? { details: error.details } : {}),
                    },
                    { status: error.statusCode }
                );
            }

            // Unexpected errors
            log.error('Unhandled error', { error });
            return NextResponse.json(
                { error: 'Internal server error', code: 'INTERNAL_ERROR' },
                { status: 500 }
            );
        }
    };
}

/**
 * Same as withAuth but for public endpoints (no auth required).
 */
export function withPublicRoute(
    handler: (
        request: Request,
        context: { log: ReturnType<typeof createRequestLogger>; params: Record<string, string> }
    ) => Promise<RouteResult>
) {
    return async (
        request: Request,
        routeContext?: { params?: Promise<Record<string, string>> }
    ) => {
        const log = createRequestLogger(request);

        try {
            const params = routeContext?.params
                ? await routeContext.params
                : {};

            const result = await handler(request, { log, params });

            if (result instanceof NextResponse) {
                log.done(result.status);
                return result;
            }

            log.done(200);
            return NextResponse.json(result, { status: 200 });
        } catch (error) {
            if (error instanceof AppError) {
                log.warn(error.message, { error });
                return NextResponse.json(
                    { error: error.message, code: error.code },
                    { status: error.statusCode }
                );
            }

            log.error('Unhandled error', { error });
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}
