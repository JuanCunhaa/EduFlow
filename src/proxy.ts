import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/verify',
  // SEO public pages
  '/cissp',
  '/cc',
  '/sscp',
  '/ccsp',
  '/cgrc',
  '/compare',
  '/blog',
  '/exam-modes',
];
const PUBLIC_EXACT = ['/'];

/**
 * Decode a JWT payload without verification (edge-compatible).
 * Returns null if the token is malformed or expired.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return payload;
  } catch {
    return null;
  }
}

/** Strip locale prefix to get the logical pathname for auth checks. */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(en|pt-BR)(\/.*)?$/);
  return match ? match[2] || '/' : pathname;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes (except public endpoints), Next.js internals, and static assets
  const publicApiPrefixes = ['/api/leads', '/api/creators', '/api/packs'];
  const isPublicApi = publicApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (
    (pathname.startsWith('/api/') && !isPublicApi) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const logicalPath = stripLocale(pathname);

  // Allow public paths — delegate to intl middleware for locale handling
  if (
    PUBLIC_EXACT.includes(logicalPath) ||
    PUBLIC_PATHS.some((p) => logicalPath.startsWith(p))
  ) {
    return intlMiddleware(request);
  }

  // Validate session cookie structure + expiry (not just existence)
  const session = request.cookies.get('__session');
  const localeMatch = pathname.match(/^\/(en|pt-BR)/);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('redirect', logicalPath);

  if (!session?.value) {
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(session.value);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    // Expired or malformed — clear the bad cookie and redirect
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    return response;
  }

  // Auth passed — delegate to intl middleware for locale negotiation
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
