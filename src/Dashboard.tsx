import Brand from './Brand';
import Integrations from './Integrations';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { services } from './site-content';
type RequestRow = {
    id: string;
    kind: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal: string;
    area: string;
    services: string;
    details: string;
    language: string;
    frequency: string;
    preferred_date: string | null;
    time_window: string | null;
    status: string;
    created_at: number;
};
type ReviewRow = {
    id: string;
    name: string;
    email: string;
    service: string;
    rating: number;
    body: string;
    status: string;
    created_at: number;
};
export default function AdminDashboard() {
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [reviews, setReviews] = useState<ReviewRow[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState('requests');
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    async function refresh() {
        setLoading(true);
        setError('');
        try {
            async function allRows(type: 'requests' | 'reviews') { let offset: number | null = 0; const rows: any[] = []; do {
                const response: Response = await fetch('/api/admin/' + type + '?offset=' + offset);
                if (!response.ok)
                    throw new Error('Unable to load records. Please sign in again.');
                const page: {
                    requests?: RequestRow[];
                    reviews?: ReviewRow[];
                    nextOffset: number | null;
                } = await response.json();
                rows.push(...(page[type] || []));
                offset = page.nextOffset;
            } while (offset !== null); return rows; }
            const [requestRows, reviewRows] = await Promise.all([allRows('requests'), allRows('reviews')]);
            setRequests(requestRows);
            setReviews(reviewRows);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load records.');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { refresh(); }, []);
    async function update(type: 'requests' | 'reviews', id: string, status: string, schedule?: {
        preferredDate: string;
        window: string;
    }) {
        setBusy(id);
        setError('');
        try {
            const r = await fetch('/api/admin/' + type, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, ...schedule }) });
            const d = await r.json() as {
                error?: string;
            };
            if (!r.ok)
                throw new Error(d.error || 'Could not save changes.');
            if (type === 'requests')
                setRequests(v => v.map(x => x.id === id ? { ...x, status, ...(schedule ? { preferred_date: schedule.preferredDate, time_window: schedule.window } : {}) } : x));
            else
                setReviews(v => v.map(x => x.id === id ? { ...x, status } : x));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save changes.');
        }
        finally {
            setBusy('');
        }
    }
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return <main className="admin">
    <header className="admin-header">
    <div>
    <Brand /><span className="eyebrow">S&A LAWN CARE / OWNER WORKSPACE</span>
    <h1>Your yard-work HQ.</h1>
    <p>Quote requests, visit dates, and customer reviews in one place.</p>
    </div>
    <div className="admin-actions">
    <a href="/">View website ↗</a>
    <a href="/api/admin/calendar">Export calendar (.ics)</a>
    <button onClick={refresh} disabled={loading}>Refresh</button><form action="/auth/logout" method="post"><button>Sign out</button></form>
    </div>
    </header>
    <Integrations /><div className="admin-stats">
    <div>
    <b>{requests.filter(x => x.status === 'pending').length}</b>
    <span>Pending requests</span>
    </div>
    <div>
    <b>{requests.filter(x => x.status === 'confirmed').length}</b>
    <span>Confirmed requests</span>
    </div>
    <div>
    <b>{reviews.filter(x => x.status === 'pending').length}</b>
    <span>Reviews to moderate</span>
    </div>
    </div>
    <div className="admin-note">Requested visits appear automatically. Contact the customer about scope and price before confirming. Confirmation checks Google Calendar for busy events. Calendar updates and email notifications run in the background; check their status below. Morning visits start at 9 am and afternoon visits at 1 pm Eastern, with two hours reserved by default. Text messages are not sent automatically.</div>{error && <div className="error" role="alert">{error}</div>}<div className="admin-calendar">
    <div className="month-heading">
    <strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
    <span>
    <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
    <ChevronLeft size={20}/>
    </button>
    <button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
    <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
    <ChevronRight size={20}/>
    </button>
    </span>
    </div>
    <div className="admin-cal-grid">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div className="day-label" key={d}>{d}</div>)}{Array.from({ length: month.getDay() }, (_, i) => <div className="admin-day" key={'blank' + i}/>)}{Array.from({ length: days }, (_, i) => {
            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
            return <div className="admin-day" key={date}>
            <b>{i + 1}</b>{requests.filter(r => r.preferred_date === date && r.status !== 'declined').map(r => <button className={'admin-event ' + r.status} key={r.id} onClick={() => { setView('requests'); setFilter('all'); setTimeout(() => document.getElementById(r.id)?.scrollIntoView({ behavior: 'smooth' }), 50); }}>{r.time_window} · {r.name}<br />{r.status}</button>)}</div>;
        })}</div>
    </div>
    <div className="form-tabs">
    <button className={view === 'requests' ? 'active' : ''} onClick={() => { setView('requests'); setFilter('all'); }}>Customer requests</button>
    <button className={view === 'reviews' ? 'active' : ''} onClick={() => { setView('reviews'); setFilter('all'); }}>Review moderation</button>
    </div>
    <div className="admin-filter">{(view === 'requests' ? ['all', 'pending', 'confirmed', 'completed', 'declined'] : ['all', 'pending', 'approved', 'hidden']).map(s => <button className={filter === s ? 'active' : ''} key={s} onClick={() => setFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}</div>{loading ? <p className="empty-state">Loading…</p> : view === 'requests' ? <>{!requests.filter(r => filter === 'all' || r.status === filter).length && <p className="empty-state">No requests in this view yet. New submissions will appear here.</p>}{requests.filter(r => filter === 'all' || r.status === filter).map(r => <article className="request-card" id={r.id} key={r.id}>
            <h3>{r.name}<span className="badge">{r.kind} · {r.status}</span>
            </h3>
            <div className="request-meta">
            <a href={'tel:' + r.phone}>{r.phone}</a>
            <a href={'mailto:' + r.email}>{r.email}</a>
            <span>{r.language}</span>
            </div>
            <p>{r.address}, {r.city} {r.postal}</p>
            <div className="request-meta">
            <span>{r.area}</span>
            <span>{r.frequency}</span>
            <span>{(JSON.parse(r.services) as string[]).map(id => services.find(s => s.id === id)?.name).join(', ')}</span>
            </div>{r.preferred_date && <p>
                <strong>Preferred visit: {r.preferred_date} · {r.time_window} (Eastern)</strong>
                </p>}<p>{r.details}</p>
            <label style={{ fontSize: 12 }}>Request status <select aria-label={'Status for ' + r.name} disabled={busy === r.id} value={r.status} onChange={e => update('requests', r.id, e.target.value)}>{['pending', 'confirmed', 'completed', 'declined'].map(s => <option key={s}>{s}</option>)}</select>
            </label>
            <form className="reschedule-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); update('requests', r.id, r.status, { preferredDate: String(f.get('date')), window: String(f.get('window')) }); }}><label>Visit date <input aria-label={'Visit date for ' + r.name} name="date" type="date" required defaultValue={r.preferred_date || ''}/></label><label>Time window <select aria-label={'Visit window for ' + r.name} name="window" defaultValue={r.time_window || 'Morning'}><option>Morning</option><option>Afternoon</option></select></label><button className="button dark" disabled={busy === r.id}>Save visit date</button></form>
            <p className="fine-print">Received {new Date(r.created_at).toLocaleString()} · {r.id.slice(0, 8).toUpperCase()}</p>
            </article>)}</> : <>
        <p className="admin-note">Approve genuine reviews regardless of star rating. Hide spam, abusive content, or personal information. Submitted text is shown as written.</p>{!reviews.filter(r => filter === 'all' || r.status === filter).length && <p className="empty-state">No reviews in this view yet.</p>}{reviews.filter(r => filter === 'all' || r.status === filter).map(r => <article className="request-card" key={r.id}>
            <h3>{r.name}<span className="badge">{r.status}</span>
            </h3>
            <div className="request-meta">
            <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            <span>{services.find(s => s.id === r.service)?.name}</span>
            <a href={'mailto:' + r.email}>{r.email}</a>
            </div>
            <p>{r.body}</p>
            <label style={{ fontSize: 12 }}>Visibility <select aria-label={'Visibility for review by ' + r.name} value={r.status} disabled={busy === r.id} onChange={e => update('reviews', r.id, e.target.value)}>{['pending', 'approved', 'hidden'].map(s => <option key={s}>{s}</option>)}</select>
            </label>
            </article>)}</>}</main>;
}
