import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/verify'];
const PUBLIC_EXACT = ['/'];

/**
 * Decode a JWT payload without verification (edge-compatible).
 * Returns null if the token is malformed or expired.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload;
    } catch {
        return null;
    }
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths and static assets
    if (
        PUBLIC_EXACT.includes(pathname) ||
        PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith('/_next')
    ) {
        return NextResponse.next();
    }

    // Validate session cookie structure + expiry (not just existence)
    const session = request.cookies.get('__session');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

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

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
