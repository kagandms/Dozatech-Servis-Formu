import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const SESSION_COOKIE = 'dozatech_session';
const failedAttemptsByIp = new Map();

/** Validates a password and issues a signed HttpOnly session cookie. */
export default function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });

    const appPassword = process.env.APP_PASSWORD;
    const sessionSecret = process.env.SESSION_SECRET;
    if (!isConfigured(appPassword, sessionSecret)) {
        return response.status(503).json({ error: 'Authentication is not configured.' });
    }
    if (!isSameOrigin(request)) return response.status(403).json({ error: 'Request rejected.' });

    const clientIp = getClientIp(request);
    const attempt = failedAttemptsByIp.get(clientIp);
    if (attempt && attempt.expiresAt > Date.now() && attempt.count >= MAX_ATTEMPTS) {
        response.setHeader('Retry-After', String(Math.ceil((attempt.expiresAt - Date.now()) / 1000)));
        return response.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    const submittedPassword = request.body?.password;
    if (typeof submittedPassword !== 'string' || !isEqualSecret(submittedPassword, appPassword)) {
        recordFailedAttempt(clientIp);
        return response.status(401).json({ error: 'Incorrect password.' });
    }

    failedAttemptsByIp.delete(clientIp);
    const remember = request.body?.remember === true;
    const maxAgeSeconds = remember ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
    const expiresAt = String(Date.now() + maxAgeSeconds * 1000);
    const signature = createHmac('sha256', sessionSecret).update(expiresAt).digest('base64url');
    response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${expiresAt}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`);
    return response.status(200).json({ ok: true });
}

/** Rejects incomplete or weak environment configuration before accepting logins. */
function isConfigured(appPassword, sessionSecret) {
    return typeof appPassword === 'string' && appPassword.length >= 8
        && typeof sessionSecret === 'string' && sessionSecret.length >= 32;
}

/** Compares password bytes without leaking length-dependent timing. */
function isEqualSecret(submittedPassword, appPassword) {
    if (Buffer.byteLength(submittedPassword) > 256) return false;
    const submittedBytes = Buffer.from(submittedPassword);
    const expectedBytes = Buffer.from(appPassword);
    return submittedBytes.length === expectedBytes.length && timingSafeEqual(submittedBytes, expectedBytes);
}

/** Requires the browser login request to originate from this deployment host. */
function isSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers.host;
    return typeof origin === 'string' && typeof host === 'string' && origin === `https://${host}`;
}

/** Extracts the first forwarded address provided by Vercel. */
function getClientIp(request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const firstAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return firstAddress?.split(',')[0]?.trim() || 'unknown';
}

/** Records a short-lived, per-runtime failed-login limit. */
function recordFailedAttempt(clientIp) {
    const current = failedAttemptsByIp.get(clientIp);
    if (!current || current.expiresAt <= Date.now()) {
        failedAttemptsByIp.set(clientIp, { count: 1, expiresAt: Date.now() + WINDOW_MS });
        return;
    }
    failedAttemptsByIp.set(clientIp, { ...current, count: current.count + 1 });
}
