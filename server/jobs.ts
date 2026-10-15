import type { Env, Job, RequestRow } from './types.ts';
import { apiFetch, ownerEmail } from './utils.ts';
import { syncCalendar } from './google.ts';
export function queue(env: Env, id: string, kind: string, entity: string, payload: unknown) { return env.DB.prepare("INSERT INTO jobs(id,kind,entity_id,payload,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,state='pending',attempts=0,next_attempt=0,last_error=NULL").bind(id, kind, entity, JSON.stringify(payload), Date.now()); }
export function requestJobs(env: Env, r: RequestRow, initial: boolean) {
    const jobs: D1PreparedStatement[] = [];
    if (r.preferred_date)
        jobs.push(queue(env, `calendar:${r.id}`, 'calendar', r.id, { revision: r.revision }));
    if (initial)
        jobs.push(queue(env, `owner:${r.id}`, 'email', r.id, { to: 'owner', subject: `New ${r.kind} request · ${r.name}`, text: `${r.name}\n${r.email} | ${r.phone}\n${r.address}, ${r.city} ${r.postal}\n${r.area}\n${r.details}\nPreferred visit: ${r.preferred_date || 'Not requested'} ${r.time_window || ''}\nReview at ${env.APP_URL}/admin` }));
    jobs.push(queue(env, `customer:${r.id}:${r.revision}`, 'email', r.id, { to: r.email, subject: initial ? 'S&A Lawn Care received your request' : `Your S&A request is ${r.status}`, text: `Hi ${r.name},\n\n${initial ? 'Thank you! We received your request. A requested day is not yet a confirmed appointment. Erik will contact you about scope, price, and availability.' : `Your request status is now: ${r.status}.`}${r.preferred_date ? `\nVisit: ${r.preferred_date}, ${r.time_window} (Eastern time).` : ''}\n\nReference: ${r.id.slice(0, 8).toUpperCase()}\nQuestions? Call 706-847-1924.\n\nS&A Lawn Care` }));
    return jobs;
}
async function sendEmail(env: Env, job: Job) {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
        throw new Error('Email is not configured. Set RESEND_API_KEY and a verified EMAIL_FROM.');
    const payload = JSON.parse(job.payload) as {
        to: string;
        subject: string;
        text: string;
    };
    const r = await apiFetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.id }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [payload.to === 'owner' ? ownerEmail(env) : payload.to], subject: payload.subject, text: payload.text }) });
    if (!r.ok)
        throw new Error(`Email delivery failed (HTTP ${r.status}). Check the sender domain, API key, and sending limits.`);
}
export async function runJobs(env: Env) {
    const now = Date.now();
    const { results } = await env.DB.prepare("SELECT id FROM jobs WHERE state='pending' AND next_attempt<=? AND lease_until<? ORDER BY created_at LIMIT 8").bind(now, now).all<{
        id: string;
    }>();
    for (const candidate of results) {
        const lease = crypto.randomUUID();
        const job = await env.DB.prepare("UPDATE jobs SET lease=?,lease_until=? WHERE id=? AND state='pending' AND next_attempt<=? AND lease_until<? RETURNING *").bind(lease, Date.now() + 180000, candidate.id, Date.now(), Date.now()).first<Job>();
        if (!job)
            continue;
        try {
            if (job.kind === 'email')
                await sendEmail(env, job);
            else if (job.kind === 'calendar') {
                const row = await env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(job.entity_id).first<RequestRow>();
                if (row)
                    await syncCalendar(env, row);
            }
            else
                throw new Error('Unknown task type.');
            await env.DB.prepare("UPDATE jobs SET state=CASE WHEN payload=? THEN 'done' ELSE 'pending' END,lease=NULL,lease_until=0,last_error=NULL WHERE id=? AND lease=?").bind(job.payload, job.id, lease).run();
        }
        catch (e) {
            const attempt = job.attempts + 1;
            const message = e instanceof Error ? e.message : 'Integration temporarily unavailable.';
            await env.DB.prepare("UPDATE jobs SET state=CASE WHEN payload!=? THEN 'pending' WHEN ?>=10 THEN 'failed' ELSE 'pending' END,attempts=?,next_attempt=?,lease=NULL,lease_until=0,last_error=? WHERE id=? AND lease=?").bind(job.payload, attempt, attempt, Date.now() + Math.min(3600000, 30000 * 2 ** attempt), message.slice(0, 240), job.id, lease).run();
        }
    }
}
