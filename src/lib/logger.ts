/**
 * Structured logger with correlation IDs and JSON output.
 * Replaces raw console.error calls across the codebase.
 *
 * In production, outputs structured JSON for ingestion by
 * logging services (Cloud Logging, Datadog, etc.).
 * In development, outputs human-readable format.
 */

function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    correlationId?: string;
    route?: string;
    userId?: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
        code?: string;
    };
    meta?: Record<string, unknown>;
    durationMs?: number;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function formatError(err: unknown): LogEntry['error'] | undefined {
    if (!err) return undefined;
    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
            code: 'code' in err ? String((err as { code: string }).code) : undefined,
        };
    }
    return { name: 'UnknownError', message: String(err) };
}

function emit(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    switch (entry.level) {
        case 'error':
            console.error(output);
            break;
        case 'warn':
            console.warn(output);
            break;
        case 'debug':
            console.debug(output);
            break;
        default:
            console.log(output);
    }
}

function log(
    level: LogLevel,
    message: string,
    context?: {
        correlationId?: string;
        route?: string;
        userId?: string;
        error?: unknown;
        meta?: Record<string, unknown>;
        durationMs?: number;
    }
): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        correlationId: context?.correlationId,
        route: context?.route,
        userId: context?.userId,
        error: formatError(context?.error),
        meta: context?.meta,
        durationMs: context?.durationMs,
    };

    emit(entry);
}

/**
 * Creates a request-scoped logger with a pre-assigned correlation ID.
 * Use in API route handlers:
 *
 * ```ts
 * const log = createRequestLogger(request);
 * log.info('Processing request');
 * log.error('Failed', { error: err });
 * ```
 */
export function createRequestLogger(
    request: Request,
    overrides?: { userId?: string }
) {
    const correlationId =
        request.headers.get('x-correlation-id') || generateId();
    const route = `${request.method} ${new URL(request.url).pathname}`;
    const startTime = Date.now();

    function makeContext(
        ctx?: Omit<Parameters<typeof log>[2], 'correlationId' | 'route'>
    ) {
        return {
            correlationId,
            route,
            userId: overrides?.userId,
            ...ctx,
        };
    }

    return {
        correlationId,

        debug(message: string, ctx?: { meta?: Record<string, unknown> }) {
            log('debug', message, makeContext(ctx));
        },

        info(message: string, ctx?: { meta?: Record<string, unknown> }) {
            log('info', message, makeContext(ctx));
        },

        warn(message: string, ctx?: { error?: unknown; meta?: Record<string, unknown> }) {
            log('warn', message, makeContext(ctx));
        },

        error(message: string, ctx?: { error?: unknown; meta?: Record<string, unknown> }) {
            log('error', message, makeContext(ctx));
        },

        /** Log request completion with duration */
        done(statusCode: number, meta?: Record<string, unknown>) {
            log('info', 'Request completed', makeContext({
                durationMs: Date.now() - startTime,
                meta: { statusCode, ...meta },
            }));
        },
    };
}

/** Standalone log functions for non-request contexts */
export const logger = {
    debug: (message: string, ctx?: Parameters<typeof log>[2]) =>
        log('debug', message, ctx),
    info: (message: string, ctx?: Parameters<typeof log>[2]) =>
        log('info', message, ctx),
    warn: (message: string, ctx?: Parameters<typeof log>[2]) =>
        log('warn', message, ctx),
    error: (message: string, ctx?: Parameters<typeof log>[2]) =>
        log('error', message, ctx),
};
