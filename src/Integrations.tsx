import { useEffect, useState } from 'react';
type State = {
    googleConnected: boolean;
    emailConfigured: boolean;
    calendarId: string;
    counts: {
        pending: number;
        failed: number;
    };
    jobs: {
        id: string;
        kind: string;
        entity_id: string;
        state: string;
        attempts: number;
        last_error: string | null;
    }[];
};
export default function Integrations() {
    const [data, setData] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    async function refresh() { try {
        const r = await fetch('/api/admin/integrations');
        if (!r.ok)
            throw new Error('Could not check integrations. Refresh or sign in again.');
        setData(await r.json());
        setError('');
    }
    catch (e) {
        setError((e as Error).message);
    } }
    useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);
    async function retry() { setBusy(true); try {
        const r = await fetch('/api/admin/retry', { method: 'POST' });
        if (!r.ok)
            throw new Error('Could not retry. Refresh or sign in again.');
        await refresh();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="integration-panel"><h2>Calendar & notifications</h2>{data ? <><p>Google account: <strong>{data.googleConnected ? 'Connected' : 'Needs connection'}</strong> · Email: <strong>{data.emailConfigured ? 'Configured' : 'Needs setup'}</strong></p><p className="fine-print">Calendar: {data.calendarId}. Connection status means credentials are saved; failed tasks appear below. Visit changes sync from this dashboard to Google. Pending and declined visits do not block calendar time.</p><p>{data.counts.pending || 0} tasks waiting · {data.counts.failed || 0} need attention</p><a href="/auth/google">Reconnect Google</a><button disabled={busy} onClick={retry}>{busy ? 'Retrying…' : 'Retry waiting tasks'}</button>{data.jobs.length > 0 && <ul className="sync-jobs">{data.jobs.map(j => <li key={j.id}>{j.kind} · {j.entity_id.slice(0, 8).toUpperCase()} · {j.state}{j.last_error ? ` — ${j.last_error}` : ' — queued'}</li>)}</ul>}</> : <p>Checking connections…</p>}{error && <p className="error" role="alert">{error}</p>}</section>;
}
