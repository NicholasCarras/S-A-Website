import type { Env, RequestRow } from './types.ts';
import { decrypt } from './auth.ts';
import { apiFetch, ownerEmail, HttpError } from './utils.ts';
import { business } from '../src/site-content.ts';
export async function accessToken(env: Env) {
    const saved = await env.DB.prepare('SELECT refresh_ciphertext FROM google_tokens WHERE email=?').bind(ownerEmail(env)).first<{
        refresh_ciphertext: string;
    }>();
    if (!saved)
        throw new Error('Connect the owner Google account from /admin first.');
    const r = await apiFetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: await decrypt(env, saved.refresh_ciphertext), grant_type: 'refresh_token' }) });
    const data = await r.json() as {
        access_token?: string;
    };
    if (!r.ok || !data.access_token)
        throw new Error('Google authorization needs attention. Reconnect Google from /admin.');
    return data.access_token;
}
// Convert a wall-clock time in the configured business timezone, including DST.
export function slotStart(date: string, window: string) {
    const hour = window === 'Morning' ? business.morningHour : business.afternoonHour;
    const target = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
    let guess = target;
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: business.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 3; i++) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p => [p.type, p.value]));
        const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
        guess += target - represented;
    }
    return new Date(guess);
}
function base(env: Env, id?: string) { return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id || env.GOOGLE_CALENDAR_ID || 'primary')}/events`; }
export async function assertCalendarFree(env: Env, row: RequestRow) {
    if (!row.preferred_date || !row.time_window)
        return;
    let token: string;
    try {
        token = await accessToken(env);
    }
    catch {
        throw new HttpError(503, 'Connect Google Calendar before confirming a visit.');
    }
    const start = slotStart(row.preferred_date, row.time_window), end = new Date(start.getTime() + business.visitHours * 3600000);
    const link = await env.DB.prepare('SELECT event_id,calendar_id FROM calendar_links WHERE request_id=?').bind(row.id).first<{
        event_id: string;
        calendar_id: string;
    }>();
    let page = '';
    let pages = 0;
    do {
        const url = new URL(base(env, link?.calendar_id));
        url.search = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', maxResults: '2500', ...(page ? { pageToken: page } : {}) }).toString();
        const r = await apiFetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok)
            throw new HttpError(503, 'Google Calendar is unavailable. Please retry before confirming.');
        const data = await r.json() as {
            items?: {
                id: string;
                status?: string;
                transparency?: string;
            }[];
            nextPageToken?: string;
        };
        if (data.items?.some(e => e.id !== link?.event_id && e.status !== 'cancelled' && e.transparency !== 'transparent'))
            throw new HttpError(409, 'That time overlaps a busy Google Calendar event. Choose another visit time.');
        page = data.nextPageToken || '';
        if (++pages > 20)
            throw new HttpError(503, 'Calendar is too busy to verify availability. Please review it manually.');
    } while (page);
}
export async function syncCalendar(env: Env, row: RequestRow) {
    if (!row.preferred_date || !row.time_window)
        return;
    const token = await accessToken(env);
    const generated = 'sa' + crypto.randomUUID().replaceAll('-', '');
    await env.DB.prepare('INSERT OR IGNORE INTO calendar_links(request_id,event_id,calendar_id) VALUES(?,?,?)').bind(row.id, generated, env.GOOGLE_CALENDAR_ID || 'primary').run();
    let link = (await env.DB.prepare('SELECT event_id,calendar_id,synced_revision FROM calendar_links WHERE request_id=?').bind(row.id).first<{
        event_id: string;
        calendar_id: string;
        synced_revision: number;
    }>())!;
    if (link.synced_revision >= row.revision)
        return;
    const start = slotStart(row.preferred_date, row.time_window);
    const event = { summary: `[${row.status.toUpperCase()}] S&A — ${row.name} · ${row.time_window}`, location: `${row.address}, ${row.city} ${row.postal}`, description: `Reference: ${row.id}\n${row.phone} | ${row.email}\n${row.area} | ${row.frequency}\n${row.details}\nManage this visit at ${env.APP_URL}/admin. Pending visits are requests, not confirmed appointments.`, start: { dateTime: start.toISOString(), timeZone: business.timezone }, end: { dateTime: new Date(start.getTime() + business.visitHours * 3600000).toISOString(), timeZone: business.timezone }, status: row.status === 'confirmed' || row.status === 'completed' ? 'confirmed' : 'tentative', transparency: row.status === 'confirmed' || row.status === 'completed' ? 'opaque' : 'transparent', visibility: 'private', extendedProperties: { private: { saRequestId: row.id } } };
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    let r = await apiFetch(`${base(env, link.calendar_id)}/${link.event_id}?sendUpdates=none`, { method: 'PATCH', headers, body: JSON.stringify(event) });
    if (r.status === 410) {
        // A manually deleted event cannot always reuse its ID. Persist a new ID before retrying.
        const next = 'sa' + crypto.randomUUID().replaceAll('-', '');
        await env.DB.prepare('UPDATE calendar_links SET event_id=? WHERE request_id=? AND event_id=?').bind(next, row.id, link.event_id).run();
        link = { ...link, event_id: next };
    }
    if (r.status === 404 || r.status === 410) {
        r = await apiFetch(`${base(env, link.calendar_id)}?sendUpdates=none`, { method: 'POST', headers, body: JSON.stringify({ id: link.event_id, ...event }) });
        if (r.status === 409)
            r = await apiFetch(`${base(env, link.calendar_id)}/${link.event_id}?sendUpdates=none`, { method: 'PATCH', headers, body: JSON.stringify(event) });
    }
    if (!r.ok)
        throw new Error(`Google Calendar sync failed (HTTP ${r.status}). Check calendar permissions and reconnect if needed.`);
    await env.DB.prepare('UPDATE calendar_links SET synced_revision=? WHERE request_id=?').bind(row.revision, row.id).run();
}
