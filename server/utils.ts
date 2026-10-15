import type { Env } from './types.ts';
export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function hash(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
export const ownerEmail = (env: Env) => (env.ADMIN_EMAIL || '').trim().toLowerCase();
export function origin(env: Env) { return new URL(env.APP_URL).origin; }
export function cookie(request: Request, name: string) { return (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || ''; }
export function cookieHeader(env: Env, name: string, value: string, seconds: number) { return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${origin(env).startsWith('https:') ? '; Secure' : ''}`; }
export function redirect(path: string, headers: HeadersInit = {}) { return new Response(null, { status: 302, headers: { Location: path, 'Cache-Control': 'no-store', ...headers } }); }
export function checkOrigin(req: Request, env: Env) { if (req.headers.get('Origin') !== origin(env))
    throw new HttpError(403, 'Please submit using the website on its configured domain.'); }
export async function body(req: Request) {
    if (!req.headers.get('content-type')?.includes('application/json'))
        throw new HttpError(415, 'JSON required.');
    const reader = req.body?.getReader();
    if (!reader)
        throw new HttpError(400, 'Missing request body.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        size += value.length;
        if (size > 16384) {
            await reader.cancel();
            throw new HttpError(413, 'Submission is too large.');
        }
        chunks.push(value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
        data.set(c, offset);
        offset += c.length;
    }
    try {
        return JSON.parse(new TextDecoder().decode(data));
    }
    catch {
        throw new HttpError(400, 'Invalid JSON.');
    }
}
export async function limit(req: Request, env: Env, bucket: string, max = 12) {
    const now = Date.now(), expires = Math.ceil((now + 1) / 3600000) * 3600000;
    const key = await hash(`${bucket}|${req.headers.get('CF-Connecting-IP') || 'local'}|${expires}`);
    const row = await env.DB.prepare('INSERT INTO request_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, expires).first<{
        count: number;
    }>();
    if (!row || row.count > max)
        throw new HttpError(429, 'Too many attempts. Please try again later or call us.');
}
export async function apiFetch(url: string, init: RequestInit = {}) {
    return fetch(url, { ...init, signal: AbortSignal.timeout(12000) });
}
export function secured(response: Response) {
    const r = new Response(response.body, response);
    r.headers.set('X-Content-Type-Options', 'nosniff');
    r.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    r.headers.set('X-Frame-Options', 'DENY');
    r.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    r.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    return r;
}
