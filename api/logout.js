const SESSION_COOKIE = 'dozatech_session';

/** Clears the browser session cookie for same-origin logout requests. */
export default function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
    if (!isSameOrigin(request)) return response.status(403).json({ error: 'Request rejected.' });

    response.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    return response.status(204).end();
}

/** Requires logout requests to originate from this deployment host. */
function isSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers.host;
    return typeof origin === 'string' && typeof host === 'string' && origin === `https://${host}`;
}
