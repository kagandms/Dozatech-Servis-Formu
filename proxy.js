import { next } from '@vercel/functions';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'dozatech_session';
const PUBLIC_PATHS = new Set(['/login.html', '/api/auth', '/api/logout', '/logo.png', '/sw.js']);

/** Protects static assets and pages with a signed, expiring session cookie. */
export default function proxy(request) {
    const requestUrl = new URL(request.url);
    if (PUBLIC_PATHS.has(requestUrl.pathname)) return next();

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) {
        return new Response('Authentication is not configured.', {
            status: 503,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    const sessionToken = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
    if (!isValidSession(sessionToken, sessionSecret)) {
        return Response.redirect(new URL('/login.html', requestUrl), 303);
    }

    return next({ headers: { 'Cache-Control': 'private, no-store' } });
}

/** Reads one cookie value without decoding or changing its signed bytes. */
function readCookie(cookieHeader, cookieName) {
    const cookie = cookieHeader?.split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`));
    return cookie?.slice(cookieName.length + 1) ?? null;
}

/** Validates the expiry and signature with a constant-time comparison. */
function isValidSession(token, secret) {
    if (!token) return false;
    const [expiryText, signature, extraPart] = token.split('.');
    if (!expiryText || !signature || extraPart) return false;

    const expiry = Number(expiryText);
    const maxExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000 + 60_000;
    if (!Number.isSafeInteger(expiry) || expiry <= Date.now() || expiry > maxExpiry) return false;

    const expected = createHmac('sha256', secret).update(expiryText).digest('base64url');
    const actualBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
