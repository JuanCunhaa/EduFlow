import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// ── Mock dependencies ────────────────────────────

const mockVerifyAuth = vi.fn();
const mockVerifyAuthStrict = vi.fn();

vi.mock('@/lib/firebase/server-auth', () => ({
  verifyAuth: () => mockVerifyAuth(),
  verifyAuthStrict: () => mockVerifyAuthStrict(),
}));

vi.mock('@/lib/logger', () => ({
  createRequestLogger: () => ({
    correlationId: 'test-corr-id',
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
  }),
}));

import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import { ValidationError, NotFoundError } from '@/lib/errors';

// ── Helpers ──────────────────────────────────────

function makeRequest(
  method: string,
  body?: object,
  headers?: Record<string, string>
): Request {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new Request('http://localhost/api/test', init);
}

const testUser = { uid: 'user-123', email: 'test@test.com', roles: [] };

// ── withAuth ─────────────────────────────────────

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue(testUser);
    mockVerifyAuthStrict.mockResolvedValue(testUser);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockVerifyAuth.mockResolvedValue(null);
    const handler = withAuth(async () => ({ data: 'ok' }));
    const res = await handler(makeRequest('GET'));
    expect(res.status).toBe(401);
  });

  it('calls handler with user context on valid auth', async () => {
    const handler = withAuth(async (_req, { user }) => ({ data: user.uid }));
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toBe('user-123');
  });

  it('returns 201 for POST requests', async () => {
    const handler = withAuth(async () => ({ data: 'created' }));
    const res = await handler(makeRequest('POST', { test: true }));
    expect(res.status).toBe(201);
  });

  it('returns 200 for GET requests', async () => {
    const handler = withAuth(async () => ({ data: 'ok' }));
    const res = await handler(makeRequest('GET'));
    expect(res.status).toBe(200);
  });

  it('passes through NextResponse from handler', async () => {
    const handler = withAuth(async () => {
      return NextResponse.json({ custom: true }, { status: 200 });
    });
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(json.custom).toBe(true);
  });

  // ── CSRF Protection ──

  it('returns 415 for POST without Content-Type: application/json', async () => {
    const handler = withAuth(async () => ({ data: 'ok' }));
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'test',
    });
    const res = await handler(req);
    expect(res.status).toBe(415);
  });

  it('allows DELETE without Content-Type check', async () => {
    const handler = withAuth(async () => ({ data: 'deleted' }));
    const req = new Request('http://localhost/api/test', {
      method: 'DELETE',
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  // ── Body size enforcement ──

  it('returns 413 for oversized request body', async () => {
    const handler = withAuth(async () => ({ data: 'ok' }), {
      maxBodySize: 100,
    });
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '200',
      },
      body: JSON.stringify({ data: 'x'.repeat(200) }),
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it('allows request within body size limit', async () => {
    const handler = withAuth(async () => ({ data: 'ok' }), {
      maxBodySize: 1000,
    });
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '50',
      },
      body: JSON.stringify({ small: true }),
    });
    const res = await handler(req);
    expect(res.status).toBe(201);
  });

  // ── Error handling ──

  it('returns structured error for AppError subclasses', async () => {
    const handler = withAuth(async () => {
      throw new ValidationError('Invalid input', { field: 'name' });
    });
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid input');
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details).toEqual({ field: 'name' });
  });

  it('returns 404 for NotFoundError', async () => {
    const handler = withAuth(async () => {
      throw new NotFoundError('Question');
    });
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe('Question not found');
  });

  it('returns 500 for unexpected errors', async () => {
    const handler = withAuth(async () => {
      throw new Error('boom');
    });
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe('Internal server error');
    expect(json.code).toBe('INTERNAL_ERROR');
  });

  // ── checkRevoked option ──

  it('uses verifyAuthStrict when checkRevoked=true', async () => {
    const handler = withAuth(async (_req, { user }) => ({ data: user.uid }), {
      checkRevoked: true,
    });
    await handler(makeRequest('GET'));
    expect(mockVerifyAuthStrict).toHaveBeenCalled();
    expect(mockVerifyAuth).not.toHaveBeenCalled();
  });

  it('uses verifyAuth when checkRevoked=false', async () => {
    const handler = withAuth(async (_req, { user }) => ({ data: user.uid }));
    await handler(makeRequest('GET'));
    expect(mockVerifyAuth).toHaveBeenCalled();
    expect(mockVerifyAuthStrict).not.toHaveBeenCalled();
  });

  // ── Route params ──

  it('resolves async route params', async () => {
    const handler = withAuth(async (_req, { params }) => ({ data: params }));
    const routeContext = { params: Promise.resolve({ examId: 'ex-123' }) };
    const res = await handler(makeRequest('GET'), routeContext);
    const json = await res.json();
    expect(json.data.examId).toBe('ex-123');
  });
});

// ── withPublicRoute ──────────────────────────────

describe('withPublicRoute', () => {
  it('executes handler without authentication', async () => {
    const handler = withPublicRoute(async () => ({ data: 'public' }));
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toBe('public');
  });

  it('returns structured error for AppError', async () => {
    const handler = withPublicRoute(async () => {
      throw new NotFoundError('Page');
    });
    const res = await handler(makeRequest('GET'));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe('Page not found');
  });

  it('returns 500 for unexpected errors', async () => {
    const handler = withPublicRoute(async () => {
      throw new Error('unexpected');
    });
    const res = await handler(makeRequest('GET'));
    expect(res.status).toBe(500);
  });

  it('passes through NextResponse from handler', async () => {
    const handler = withPublicRoute(async () => {
      return NextResponse.json({ ok: true }, { status: 202 });
    });
    const res = await handler(makeRequest('GET'));
    expect(res.status).toBe(202);
  });

  it('resolves async route params', async () => {
    const handler = withPublicRoute(async (_req, { params }) => ({
      data: params,
    }));
    const routeContext = { params: Promise.resolve({ slug: 'test' }) };
    const res = await handler(makeRequest('GET'), routeContext);
    const json = await res.json();
    expect(json.data.slug).toBe('test');
  });
});
