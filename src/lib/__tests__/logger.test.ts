import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save originals
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.fn>;
  let debugSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logSpy = vi.fn();
    errorSpy = vi.fn();
    warnSpy = vi.fn();
    debugSpy = vi.fn();
    console.log = logSpy as unknown as typeof console.log;
    console.error = errorSpy as unknown as typeof console.error;
    console.warn = warnSpy as unknown as typeof console.warn;
    console.debug = debugSpy as unknown as typeof console.debug;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
    vi.resetModules();
  });

  it('logger.info outputs JSON to console.log', async () => {
    const { logger } = await import('@/lib/logger');
    logger.info('Test message');
    expect(logSpy).toHaveBeenCalled();
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.level).toBe('info');
    expect(output.message).toBe('Test message');
    expect(output.timestamp).toBeDefined();
  });

  it('logger.error outputs JSON to console.error', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('Error occurred', { error: new Error('test error') });
    expect(errorSpy).toHaveBeenCalled();
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.level).toBe('error');
    expect(output.message).toBe('Error occurred');
    expect(output.error.name).toBe('Error');
    expect(output.error.message).toBe('test error');
  });

  it('logger.warn outputs JSON to console.warn', async () => {
    const { logger } = await import('@/lib/logger');
    logger.warn('Warning');
    expect(warnSpy).toHaveBeenCalled();
    const output = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(output.level).toBe('warn');
  });

  it('includes meta data in log entry', async () => {
    const { logger } = await import('@/lib/logger');
    logger.info('With meta', { meta: { userId: 'u1', action: 'login' } });
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.meta.userId).toBe('u1');
    expect(output.meta.action).toBe('login');
  });

  it('includes correlationId when provided', async () => {
    const { logger } = await import('@/lib/logger');
    logger.info('Correlated', { correlationId: 'corr-123' });
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.correlationId).toBe('corr-123');
  });

  it('formats non-Error objects in error field', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('Strange error', { error: 'just a string' });
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.error.name).toBe('UnknownError');
    expect(output.error.message).toBe('just a string');
  });

  it('handles null error gracefully', async () => {
    const { logger } = await import('@/lib/logger');
    logger.error('Null err', { error: null });
    const output = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(output.error).toBeUndefined();
  });
});

describe('createRequestLogger', () => {
  let logSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logSpy = vi.fn();
    console.log = logSpy as unknown as typeof console.log;
    console.error = vi.fn() as unknown as typeof console.error;
    console.warn = vi.fn() as unknown as typeof console.warn;
    console.debug = vi.fn() as unknown as typeof console.debug;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
    vi.resetModules();
  });

  it('creates a scoped logger with correlation ID', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/test', { method: 'GET' });
    const log = createRequestLogger(req);
    expect(log.correlationId).toBeDefined();
    expect(typeof log.correlationId).toBe('string');
  });

  it('uses x-correlation-id from request headers if present', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/test', {
      method: 'GET',
      headers: { 'x-correlation-id': 'custom-corr-id' },
    });
    const log = createRequestLogger(req);
    expect(log.correlationId).toBe('custom-corr-id');
  });

  it('log.done includes duration and status', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/test', { method: 'POST' });
    const log = createRequestLogger(req);
    log.done(201);
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.message).toBe('Request completed');
    expect(output.meta.statusCode).toBe(201);
    expect(output.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('includes userId when provided via overrides', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/test', { method: 'GET' });
    const log = createRequestLogger(req, { userId: 'user-xyz' });
    log.info('Test');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.userId).toBe('user-xyz');
  });

  it('includes route in log entries', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/exams', { method: 'DELETE' });
    const log = createRequestLogger(req);
    log.info('Deleting');
    const output = JSON.parse(logSpy.mock.calls[0][0]);
    expect(output.route).toBe('DELETE /api/exams');
  });

  it('has all log level methods', async () => {
    const { createRequestLogger } = await import('@/lib/logger');
    const req = new Request('http://localhost/api/test', { method: 'GET' });
    const log = createRequestLogger(req);
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.done).toBe('function');
  });
});
