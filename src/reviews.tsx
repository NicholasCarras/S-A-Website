import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X, Star, LoaderCircle } from 'lucide-react';
import { services } from './site-content';
type Review = {
    id: string;
    name: string;
    service: string;
    rating: number;
    body: string;
    created_at: number;
};
export default function Reviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(false);
    const [rating, setRating] = useState(5);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useRef('');
    useEffect(() => {
        fetch('/api/reviews').then(async (r) => {
            if (!r.ok)
                throw new Error();
            const d = await r.json() as {
                reviews: Review[];
            };
            setReviews(d.reviews);
        }).catch(() => setLoadError(true)).finally(() => setLoading(false));
    }, []);
    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError('');
        const f = new FormData(e.currentTarget);
        if (!id.current)
            id.current = crypto.randomUUID();
        try {
            const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.current, name: f.get('name'), email: f.get('email'), service: f.get('service'), rating, body: f.get('body'), consent: f.get('consent') === 'on', website: f.get('website') }) });
            const d = await r.json() as {
                error?: string;
            };
            if (!r.ok)
                throw new Error(d.error);
            setSuccess(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Please try again.');
        }
        finally {
            setBusy(false);
        }
    }
    function close() { dialog.current?.close(); trigger.current?.focus(); }
    const cards = reviews.map(r => <article className="review-card" key={r.id}>
    <div className="review-stars" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
    <blockquote>“{r.body}”</blockquote>
    <footer>
    <b>{r.name}</b>
    <span>{services.find(s => s.id === r.service)?.name}</span>
    </footer>
    </article>);
    return <section className="reviews-section" id="reviews">
    <div className="container section-heading">
    <div>
    <span className="eyebrow">GOOD WORK GETS PEOPLE TALKING</span>
    <h2>From their yards.<br />
    <em>In their words.</em>
    </h2>
    </div>
    <div className="review-controls">{reviews.length > 1 && <button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Resume motion' : 'Pause motion'}</button>}<button className="button dark" ref={trigger} onClick={() => dialog.current?.showModal()}>Leave a review <ArrowUpRight size={18}/>
    </button>
    </div>
    </div>{reviews.length ? <div className="review-track" tabIndex={0} aria-label="Customer reviews. Focus or hover to pause scrolling.">
        <div className={'review-motion' + (paused || reviews.length < 2 ? ' paused' : '')}>
        <div className="review-group">{cards}</div>{reviews.length > 1 && <div className="review-group duplicate" aria-hidden="true">{cards}</div>}</div>
        </div> : <div className="review-empty">
        <span>{loading ? 'A word from the neighborhood.' : loadError ? 'A word from the neighborhood.' : 'Your yard. Your story.'}</span>
        <p>{loading ? 'Loading customer reviews…' : loadError ? 'Reviews are temporarily unavailable. Please check back shortly.' : 'Had S&A work on your property? Be the first to share your experience here. Reviews appear after moderation.'}</p>
        </div>}<dialog ref={dialog} className="review-modal" onClick={e => {
            if (e.target === dialog.current) {
                const r = dialog.current.getBoundingClientRect();
                if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
                    close();
            }
        }} aria-labelledby="review-title">
    <div className="modal-top">
    <h3 id="review-title">How did we do?</h3>
    <button onClick={close} aria-label="Close review form">
    <X size={22}/>
    </button>
    </div>{success ? <div className="review-status" role="status">Thank you for sharing your experience. Your review has been saved and will appear here after moderation. Your email will stay private.</div> : <form className="review-form" onSubmit={submit}>
        <p>Share an honest review of your experience with S&A. Your display name and review will be public once approved.</p>
        <fieldset>
        <legend style={{ fontSize: 12 }}>Your rating</legend>
        <div className="rating-row" role="radiogroup" aria-label="Star rating">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>)}</div>
        </fieldset>
        <label>Display name<input name="name" placeholder="For example, Alex M." minLength={2} maxLength={80} required/>
        </label>
        <label>Email (kept private)<input type="email" name="email" maxLength={254} required/>
        </label>
        <label>Service received<select name="service">{services.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select>
        </label>
        <label>Your review<textarea name="body" rows={4} minLength={15} maxLength={1200} placeholder="What was your experience like?" required/>
        </label>
        <div className="honey" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off"/>
        </div>
        <label className="consent">
        <input name="consent" type="checkbox" required/>
        <span>This reflects my own experience, and I consent to S&A publishing this review and my display name. <a href="/privacy">Privacy notice</a>
        </span>
        </label>{error && <div role="alert" className="error">{error}</div>}<button disabled={busy} className="button dark">{busy ? <>
            <LoaderCircle className="spin" size={18}/>Saving…</> : <>Submit review <ArrowUpRight size={18}/>
            </>}</button>
        <p className="fine-print" style={{ marginTop: 15 }}>Reviews are moderated for authenticity, privacy, and abusive content—not for whether the feedback is positive.</p>
        </form>}</dialog>
    </section>;
}
