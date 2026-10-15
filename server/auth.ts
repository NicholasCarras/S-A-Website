import type { Env } from './types.ts';
import { apiFetch, random, hash, cookie, cookieHeader, ownerEmail, origin, redirect, HttpError } from './utils.ts';
const SESSION = 'sa_session', STATE = 'sa_oauth';
async function key(env: Env) {
    if (!/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY || ''))
        throw new HttpError(503, 'Owner authentication needs its encryption key.');
    return crypto.subtle.importKey('raw', Uint8Array.from(env.TOKEN_ENCRYPTION_KEY.match(/../g)!.map(h => parseInt(h, 16))), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
export async function encrypt(env: Env, value: string) { const iv = crypto.getRandomValues(new Uint8Array(12)); const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), new TextEncoder().encode(value)); return JSON.stringify({ iv: [...iv], data: [...new Uint8Array(data)] }); }
export async function decrypt(env: Env, value: string) { const { iv, data } = JSON.parse(value); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, await key(env), new Uint8Array(data))); }
export async function owner(req: Request, env: Env) {
    const token = cookie(req, SESSION);
    if (!token || !ownerEmail(env))
        return null;
    const row = await env.DB.prepare('SELECT email FROM sessions WHERE token_hash=? AND expires>?').bind(await hash(token), Date.now()).first<{
        email: string;
    }>();
    return row?.email === ownerEmail(env) ? row.email : null;
}
export async function requireOwner(req: Request, env: Env) { if (!await owner(req, env))
    throw new HttpError(401, 'Owner sign-in required.'); }
export async function startLogin(env: Env) {
    if (!ownerEmail(env) || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
        throw new HttpError(503, 'Set up the owner email and Google credentials first. See SETUP.md.');
    await key(env);
    const state = random(), verifier = random();
    await env.DB.prepare('INSERT INTO oauth_states(state_hash,verifier,expires) VALUES (?,?,?)').bind(await hash(state), verifier, Date.now() + 600000).run();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: origin(env) + '/auth/callback', response_type: 'code', scope: 'openid email https://www.googleapis.com/auth/calendar.events', state, code_challenge: await hash(verifier), code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent', login_hint: ownerEmail(env) }).toString();
    return redirect(url.toString(), { 'Set-Cookie': cookieHeader(env, STATE, state, 600) });
}
export async function callback(req: Request, env: Env) {
    const url = new URL(req.url), state = url.searchParams.get('state');
    if (!state || state !== cookie(req, STATE))
        throw new HttpError(400, 'Sign-in expired. Please return to the dashboard and try again.');
    const row = await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=? AND expires>? RETURNING verifier').bind(await hash(state), Date.now()).first<{
        verifier: string;
    }>();
    if (!row)
        throw new HttpError(400, 'Sign-in expired or already used.');
    if (url.searchParams.get('error') || !url.searchParams.get('code'))
        return redirect('/admin?login=cancelled', { 'Set-Cookie': cookieHeader(env, STATE, '', 0) });
    const result = await apiFetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, code: url.searchParams.get('code')!, code_verifier: row.verifier, redirect_uri: origin(env) + '/auth/callback', grant_type: 'authorization_code' }) });
    const token = await result.json() as {
        access_token?: string;
        refresh_token?: string;
        scope?: string;
    };
    if (!result.ok || !token.access_token)
        throw new HttpError(502, 'Google sign-in failed. Try again.');
    const identity = await apiFetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const user = await identity.json() as {
        email?: string;
        email_verified?: boolean;
    };
    if (!identity.ok || !user.email_verified || !ownerEmail(env) || user.email?.toLowerCase() !== ownerEmail(env))
        throw new HttpError(403, 'This Google account is not the configured owner.');
    if (!token.scope?.split(' ').includes('https://www.googleapis.com/auth/calendar.events'))
        throw new HttpError(403, 'Calendar permission is required. Sign in again and allow calendar access.');
    if (token.refresh_token)
        await env.DB.prepare('INSERT INTO google_tokens(email,refresh_ciphertext,updated_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET refresh_ciphertext=excluded.refresh_ciphertext,updated_at=excluded.updated_at').bind(ownerEmail(env), await encrypt(env, token.refresh_token), Date.now()).run();
    const existing = await env.DB.prepare('SELECT email FROM google_tokens WHERE email=?').bind(ownerEmail(env)).first();
    if (!existing)
        throw new HttpError(503, 'Google did not return offline access. Remove this app from your Google connections and sign in again.');
    const session = random();
    await env.DB.prepare('INSERT INTO sessions(token_hash,email,expires) VALUES(?,?,?)').bind(await hash(session), ownerEmail(env), Date.now() + 7 * 86400000).run();
    const headers = new Headers({ Location: '/admin', 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', cookieHeader(env, SESSION, session, 7 * 86400));
    headers.append('Set-Cookie', cookieHeader(env, STATE, '', 0));
    return new Response(null, { status: 302, headers });
}
export async function logout(req: Request, env: Env) { await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(cookie(req, SESSION))).run(); return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': cookieHeader(env, SESSION, '', 0), 'Cache-Control': 'no-store' } }); }
