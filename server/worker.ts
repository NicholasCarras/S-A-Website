import type { Env, RequestRow } from './types.ts';
import { json, HttpError, checkOrigin, body, limit, secured, ownerEmail, origin } from './utils.ts';
import { owner, requireOwner, startLogin, callback, logout } from './auth.ts';
import { requestSchema, reviewSchema, statusSchema, reviewStatusSchema, localDate } from './validation.ts';
import { queue, requestJobs, runJobs } from './jobs.ts';
import { assertCalendarFree } from './google.ts';
import { calendarText } from './calendar-export.ts';
import { business } from '../src/site-content.ts';
import { ZodError } from 'zod';
async function routes(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url), path = url.pathname, method = req.method;
    if (path.startsWith('/auth/') || path.startsWith('/api/')) {
        if (url.origin !== origin(env))
            throw new HttpError(400, 'This address does not match APP_URL. Use the configured website domain.');
        if (!['GET', 'HEAD'].includes(method))
            checkOrigin(req, env);
    }
    if (path === '/auth/google' && method === 'GET') {
        await limit(req, env, 'login', 30);
        return startLogin(env);
    }
    if (path === '/auth/callback' && method === 'GET')
        return callback(req, env);
    if (path === '/auth/logout' && method === 'POST')
        return logout(req, env);
    if (path === '/api/session' && method === 'GET')
        return json({ authenticated: !!await owner(req, env), configured: !!(env.ADMIN_EMAIL && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY) });
    if (path === '/api/reviews' && method === 'GET') {
        const { results } = await env.DB.prepare("SELECT id,name,service,rating,body,created_at FROM reviews WHERE status='approved' ORDER BY created_at DESC LIMIT 60").all();
        const r = json({ reviews: results });
        r.headers.set('Cache-Control', 'public, max-age=30');
        return r;
    }
    if (path === '/api/requests' && method === 'POST') {
        await limit(req, env, 'submit');
        const v = requestSchema.parse(await body(req));
        if (await env.DB.prepare('SELECT id FROM requests WHERE id=?').bind(v.id).first())
            return json({ id: v.id });
        const r: RequestRow = { id: v.id, kind: v.kind, name: v.name, email: v.email, phone: v.phone, address: v.address, city: v.city, postal: v.postal, area: v.area, services: JSON.stringify(v.services), details: v.details, language: v.language, frequency: v.frequency, preferred_date: v.kind === 'visit' ? v.preferredDate : null, time_window: v.kind === 'visit' ? v.window : null, status: 'pending', created_at: Date.now(), revision: 1 };
        const keys = Object.keys(r);
        try {
            await env.DB.batch([env.DB.prepare(`INSERT INTO requests(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).bind(...Object.values(r)), ...requestJobs(env, r, true)]);
        }
        catch (e) {
            if (await env.DB.prepare('SELECT id FROM requests WHERE id=?').bind(v.id).first())
                return json({ id: v.id });
            throw e;
        }
        ctx.waitUntil(runJobs(env));
        return json({ id: v.id }, 201);
    }
    if (path === '/api/reviews' && method === 'POST') {
        await limit(req, env, 'submit');
        const v = reviewSchema.parse(await body(req));
        if (await env.DB.prepare('SELECT id FROM reviews WHERE id=?').bind(v.id).first())
            return json({ id: v.id });
        try {
            await env.DB.batch([env.DB.prepare('INSERT INTO reviews(id,name,email,service,rating,body,status,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(v.id, v.name, v.email, v.service, v.rating, v.body, 'pending', Date.now()), queue(env, `review:${v.id}`, 'email', v.id, { to: 'owner', subject: 'A new S&A review awaits moderation', text: `A customer submitted a ${v.rating}-star review. Review it at ${env.APP_URL}/admin.` })]);
        }
        catch (e) {
            if (await env.DB.prepare('SELECT id FROM reviews WHERE id=?').bind(v.id).first())
                return json({ id: v.id });
            throw e;
        }
        ctx.waitUntil(runJobs(env));
        return json({ id: v.id }, 201);
    }
    if (path.startsWith('/api/admin/')) {
        await requireOwner(req, env);
        if ((path === '/api/admin/requests' || path === '/api/admin/reviews') && method === 'GET') {
            const table = path.endsWith('requests') ? 'requests' : 'reviews';
            const offset = Math.max(0, Math.min(1000000, Number(url.searchParams.get('offset')) || 0));
            const { results } = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC,id DESC LIMIT 100 OFFSET ?`).bind(offset).all();
            return json({ [table]: results, nextOffset: results.length === 100 ? offset + 100 : null });
        }
        if (path === '/api/admin/requests' && method === 'PATCH') {
            const v = statusSchema.parse(await body(req));
            const old = await env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(v.id).first<RequestRow>();
            if (!old)
                throw new HttpError(404, 'Request not found.');
            const r = { ...old, status: v.status, preferred_date: v.preferredDate || old.preferred_date, time_window: v.window || old.time_window, revision: old.revision + 1 };
            if (v.preferredDate) {
                const date = new Date(v.preferredDate + 'T12:00:00Z');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v.preferredDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== v.preferredDate || v.preferredDate < localDate() || v.preferredDate > localDate(new Date(Date.now() + business.bookingHorizonDays * 86400000)))
                    throw new HttpError(400, 'Choose a valid date from today through the next six months.');
            }
            if (r.preferred_date && !r.time_window)
                throw new HttpError(400, 'Choose a time window.');
            if (old.status === r.status && old.preferred_date === r.preferred_date && old.time_window === r.time_window)
                return json({ ok: true });
            if (r.status === 'confirmed' && r.preferred_date) {
                if (r.preferred_date < localDate())
                    throw new HttpError(400, 'Choose a current or future visit day.');
                await assertCalendarFree(env, r);
            }
            try {
                await env.DB.batch([
                    env.DB.prepare('INSERT INTO request_revisions(request_id,revision) VALUES(?,?)').bind(r.id, r.revision),
                    env.DB.prepare('UPDATE requests SET status=?,preferred_date=?,time_window=?,revision=? WHERE id=?').bind(r.status, r.preferred_date, r.time_window, r.revision, r.id), ...requestJobs(env, r, false)
                ]);
            }
            catch (e) {
                if (String(e).includes('UNIQUE'))
                    throw new HttpError(409, 'That slot is already confirmed or this request changed. Refresh and try again.');
                throw e;
            }
            ctx.waitUntil(runJobs(env));
            return json({ ok: true });
        }
        if (path === '/api/admin/reviews' && method === 'PATCH') {
            const v = reviewStatusSchema.parse(await body(req));
            const result = await env.DB.prepare('UPDATE reviews SET status=? WHERE id=?').bind(v.status, v.id).run();
            if (!result.meta.changes)
                throw new HttpError(404, 'Review not found.');
            return json({ ok: true });
        }
        if (path === '/api/admin/calendar' && method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM requests WHERE preferred_date IS NOT NULL ORDER BY preferred_date').all();
            return new Response(calendarText(results), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="sa-visits.ics"', 'Cache-Control': 'no-store' } });
        }
        if (path === '/api/admin/integrations' && method === 'GET') {
            const connected = !!await env.DB.prepare('SELECT email FROM google_tokens WHERE email=?').bind(ownerEmail(env)).first();
            const { results: jobs } = await env.DB.prepare("SELECT id,kind,entity_id,state,attempts,last_error,next_attempt FROM jobs WHERE state!='done' ORDER BY created_at LIMIT 100").all();
            const counts = await env.DB.prepare("SELECT SUM(CASE WHEN state='pending' THEN 1 ELSE 0 END) pending,SUM(CASE WHEN state='failed' THEN 1 ELSE 0 END) failed FROM jobs").first();
            return json({ googleConnected: connected, emailConfigured: !!env.RESEND_API_KEY && !!env.EMAIL_FROM, calendarId: env.GOOGLE_CALENDAR_ID || 'primary', jobs, counts });
        }
        if (path === '/api/admin/retry' && method === 'POST') {
            await env.DB.prepare("UPDATE jobs SET state='pending',attempts=0,next_attempt=0 WHERE state IN ('failed','pending') AND lease_until<?").bind(Date.now()).run();
            ctx.waitUntil(runJobs(env));
            return json({ ok: true });
        }
    }
    if (path.startsWith('/api/') || path.startsWith('/auth/'))
        throw new HttpError(404, 'Route not found.');
    if (method !== 'GET' && method !== 'HEAD')
        throw new HttpError(405, 'Method not allowed.');
    if (!['/', '/admin', '/privacy'].includes(path) && !path.includes('.'))
        return new Response('Page not found', { status: 404 });
    const asset = await env.ASSETS.fetch(req);
    const r = new Response(asset.body, asset);
    if (path === '/admin') {
        r.headers.set('Cache-Control', 'no-store');
        r.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return r;
}
export default {
    async fetch(req: Request, env: Env, ctx: ExecutionContext) { try {
        return secured(await routes(req, env, ctx));
    }
    catch (e) {
        if (e instanceof ZodError)
            return secured(json({ error: e.issues[0]?.message || 'Please check your submission.' }, 400));
        if (e instanceof HttpError)
            return secured(json({ error: e.message }, e.status));
        console.error('Request failed', e instanceof Error ? e.name : 'Unknown error');
        return secured(json({ error: 'The service is temporarily unavailable. Please retry or call 706-847-1924.' }, 503));
    } },
    async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) { ctx.waitUntil((async () => { await runJobs(env); await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()), env.DB.prepare('DELETE FROM oauth_states WHERE expires<?').bind(Date.now()), env.DB.prepare('DELETE FROM request_limits WHERE expires<?').bind(Date.now()), env.DB.prepare("DELETE FROM jobs WHERE state='done' AND created_at<?").bind(Date.now() - 30 * 86400000)]); })()); }
};
