import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './Home';
import Privacy from './Privacy';
import Dashboard from './Dashboard';
import Brand from './Brand';
import './styles.css';
function Admin() {
    const [session, setSession] = useState<{
        authenticated: boolean;
        configured: boolean;
    } | null>(null);
    const [error, setError] = useState('');
    useEffect(() => { document.title = 'Owner dashboard | S&A Lawn Care'; fetch('/api/session').then(async (r) => { if (!r.ok)
        throw new Error('Could not check sign-in. Make sure the database and website URL are configured.'); setSession(await r.json()); }).catch(e => setError(e.message)); }, []);
    if (session?.authenticated)
        return <Dashboard />;
    return <main className="login-card"><Brand /><span className="eyebrow" style={{ marginTop: 24 }}>OWNER WORKSPACE</span><h1>A little less admin.<br />A little more outside.</h1><p>Manage customer requests, review visit dates, and approve reviews.</p>{error ? <p className="error" role="alert">{error}</p> : !session ? <p>Checking sign-in…</p> : session.configured ? <><a className="button dark" href="/auth/google">Sign in with Google ↗</a><p className="fine-print" style={{ marginTop: 20 }}>Only the configured owner account can access this workspace. Sign-in also connects your Google Calendar.</p></> : <p>Owner sign-in needs to be configured. Follow SETUP.md in your source download.</p>}<p style={{ marginTop: 20 }}><a href="/">← Back to the website</a></p></main>;
}
const path = window.location.pathname;
if (path === '/privacy')
    document.title = 'Privacy | S&A Lawn Care';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{path === '/admin' ? <Admin /> : path === '/privacy' ? <Privacy /> : path === '/' ? <Home /> : <main className="legal"><Brand /><h1>Page not found.</h1><a href="/">Return home</a></main>}</React.StrictMode>);
