import Brand from './Brand';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDown, Phone, Menu, X, Check, Leaf, Trees, Droplets, Scissors, CalendarDays, ChevronLeft, ChevronRight, MapPin, MessageCircle, Plus, Minus, LoaderCircle } from 'lucide-react';
import { business, services, faqs } from './site-content';
import Reviews from './reviews';
import { localDate } from './dates';
const icons = [Scissors, Trees, Droplets, Leaf];
function Mower() {
    return <svg viewBox="0 0 150 100" aria-hidden="true">
    <ellipse cx="75" cy="88" rx="58" ry="7" fill="#09291e" opacity=".18"/>
    <path d="M43 45L27 10H13" fill="none" stroke="#1b2d27" strokeWidth="6" strokeLinecap="round"/>
    <path d="M43 48L30 16" stroke="#b4c6b4" strokeWidth="2"/>
    <path d="M28 62Q29 50 43 49H94L117 64V75H24Z" fill="#e9bd3e"/>
    <path d="M56 35H85L94 50H49Z" fill="#243b32"/>
    <rect x="59" y="30" width="22" height="7" rx="3" fill="#172b24"/>
    <path d="M31 62H112" stroke="#f9df6b" strokeWidth="3"/>
    <circle cx="43" cy="75" r="15" fill="#1b2d27"/>
    <circle cx="43" cy="75" r="7" fill="#c5cabd"/>
    <circle cx="101" cy="75" r="13" fill="#1b2d27"/>
    <circle cx="101" cy="75" r="6" fill="#c5cabd"/>
    <path d="M33 42L20 38L18 66L28 68" fill="#465c46"/>
    <path d="M119 68L132 64M121 72L138 73M117 61L129 55" stroke="#e4ec85" strokeWidth="2" strokeLinecap="round"/>
    </svg>;
}
function LawnReveal() {
    const [cut, setCut] = useState(18);
    const ref = useRef<HTMLDivElement>(null);
    const manual = useRef(false);
    useEffect(() => {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced)
            return;
        let tick = false;
        const run = () => {
            if (tick)
                return;
            tick = true;
            requestAnimationFrame(() => {
                if (ref.current && !manual.current) {
                    const rect = ref.current.getBoundingClientRect();
                    setCut(Math.max(8, Math.min(93, ((innerHeight - rect.top) / (innerHeight + rect.height)) * 110)));
                }
                tick = false;
            });
        };
        addEventListener('scroll', run, { passive: true });
        run();
        return () => removeEventListener('scroll', run);
    }, []);
    return <section className="lawn-story" ref={ref}>
    <div className="container lawn-copy">
    <span className="eyebrow">A LITTLE CARE. A BIG DIFFERENCE.</span>
    <h2>That fresh-cut feeling.<br />
    <span>Without lifting a finger.</span>
    </h2>
    <p>More time enjoying your yard.<br />Less time working on it.</p>
    </div>
    <div className="mow-field">
    <div className="grass-uncut"/>
    <div className="grass-cut" style={{ width: `${cut}%` }}/>
    <div className="mower" style={{ left: `${cut}%` }}>
    <Mower />
    </div>
    <span className="field-tag">THE S&A TOUCH</span>
    <label className="mow-control">Give it a mow <ArrowRight size={16}/>
    <input aria-label="Drag to mow the lawn illustration" type="range" min="8" max="93" value={cut} onChange={e => { manual.current = true; setCut(+e.target.value); }}/>
    </label>
    </div>
    </section>;
}
function MonthPicker({ value, onChange }: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
    const today = localDate();
    const limit = localDate(new Date(Date.now() + business.bookingHorizonDays * 86400000));
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return <div className="date-picker">
    <div className="month-heading">
    <strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
    <span>
    <button type="button" aria-label="Previous month" disabled={month.getFullYear() * 12 + month.getMonth() <= +today.slice(0, 4) * 12 + (+today.slice(5, 7) - 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
    <ChevronLeft size={18}/>
    </button>
    <button type="button" aria-label="Next month" disabled={month.getFullYear() * 12 + month.getMonth() >= +limit.slice(0, 4) * 12 + (+limit.slice(5, 7) - 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
    <ChevronRight size={18}/>
    </button>
    </span>
    </div>
    <div className="days-grid">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="day-label">{d}</span>)}{Array.from({ length: month.getDay() }, (_, i) => <span key={'empty' + i}/>)}{Array.from({ length: days }, (_, i) => { const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; return <button type="button" key={date} disabled={date <= today || date > limit} aria-label={date} aria-pressed={date === value} className={date === value ? 'chosen' : ''} onClick={() => onChange(date)}>{i + 1}</button>; })}</div>
    </div>;
}
function RequestForm({ kind, setKind, selected, setSelected }: {
    kind: 'quote' | 'visit';
    setKind: (s: 'quote' | 'visit') => void;
    selected: string[];
    setSelected: (s: string[]) => void;
}) {
    const [date, setDate] = useState('');
    const [window, setWindow] = useState('Morning');
    const [areaUnit, setAreaUnit] = useState('acres');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const requestId = useRef('');
    const formRef = useRef<HTMLFormElement>(null);
    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        if (!selected.length) {
            setError('Select at least one service.');
            return;
        }
        if (kind === 'visit' && !date) {
            setError('Choose your preferred visit date.');
            return;
        }
        const form = new FormData(e.currentTarget);
        if (!requestId.current)
            requestId.current = crypto.randomUUID();
        const payload = { id: requestId.current, kind, name: form.get('name'), email: form.get('email'), phone: form.get('phone'), address: form.get('address'), city: form.get('city'), postal: form.get('postal'), area: areaUnit === 'Not sure' ? 'Not sure' : `${form.get('area')} ${areaUnit}`, services: selected, details: form.get('details'), language: form.get('language'), frequency: form.get('frequency'), preferredDate: kind === 'visit' ? date : null, window: kind === 'visit' ? window : null, website: form.get('website'), consent: form.get('consent') === 'on' };
        setBusy(true);
        try {
            const r = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await r.json() as {
                error?: string;
                id?: string;
            };
            if (!r.ok)
                throw new Error(result.error || 'Please try again.');
            setDone(result.id || requestId.current);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Please try again or call Erik.');
        }
        finally {
            setBusy(false);
        }
    }
    if (done)
        return <div className="request-success" role="status">
        <span className="success-icon">
        <Check size={34}/>
        </span>
        <span className="eyebrow">THANK YOU FOR REACHING OUT</span>
        <h3>Your yard is one<br />step closer.</h3>
        <p>Your request has been saved. Erik will contact you to discuss the work{kind === 'visit' ? ' and confirm your preferred visit day' : ''}.</p>{kind === 'visit' && <p className="success-date">
            <CalendarDays size={18}/>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {window}<br />Requested, awaiting confirmation</p>}<small>Reference: {done.slice(0, 8).toUpperCase()}</small>
        <button className="button dark" onClick={() => { setDone(''); requestId.current = ''; setDate(''); }}>Start another request <ArrowRight size={18}/>
        </button>
        </div>;
    return <form className="request-form" ref={formRef} onSubmit={submit}>
    <div className="form-tabs" role="group" aria-label="Request type">
    <button type="button" className={kind === 'quote' ? 'active' : ''} onClick={() => setKind('quote')}>Get a quote <ArrowUpRight size={17}/>
    </button>
    <button type="button" className={kind === 'visit' ? 'active' : ''} onClick={() => setKind('visit')}>Request a visit <CalendarDays size={17}/>
    </button>
    </div>
    <div className="form-inner">
    <h3>{kind === 'quote' ? 'Tell us about your project.' : 'Let’s find a day for your yard.'}</h3>
    <p className="form-intro">{kind === 'quote' ? 'A few details are all we need to get started.' : 'Choose a preferred day. Erik will reach out to confirm.'}</p>
    <fieldset>
    <legend>What can we help with? <span>Select all that apply</span>
    </legend>
    <div className="service-options">{services.map((s, i) => {
            const Icon = icons[i];
            return <label className={selected.includes(s.id) ? 'selected' : ''} key={s.id}>
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => setSelected(selected.includes(s.id) ? selected.filter(v => v !== s.id) : [...selected, s.id])}/>
            <Icon size={17}/>{s.name}</label>;
        })}</div>
    </fieldset>
    <div className="form-grid">
    <label>Your name<input name="name" autoComplete="name" placeholder="First and last name" minLength={2} maxLength={100} required/>
    </label>
    <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="(706) 000-0000" required/>
    </label>
    <label className="wide">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required/>
    </label>
    <label className="wide">Property address<input name="address" autoComplete="street-address" placeholder="Street address" minLength={4} maxLength={200} required/>
    </label>
    <label>City<input name="city" autoComplete="address-level2" placeholder="City" minLength={2} maxLength={100} required/>
    </label>
    <label>ZIP code<input name="postal" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" placeholder="ZIP code" required/>
    </label>
    <label>Approximate property size<div className="area-input">{areaUnit !== 'Not sure' && <input aria-label="Property size" name="area" type="number" min="0.01" max="100000000" step="any" placeholder="0.5" required/>}<select aria-label="Property size unit" value={areaUnit} onChange={e => setAreaUnit(e.target.value)}>
    <option>acres</option>
    <option>sq ft</option>
    <option>Not sure</option>
    </select>
    </div>
    </label>
    <label>How often?<select name="frequency">
    <option>One-time</option>
    <option>Recurring</option>
    <option>Not sure</option>
    </select>
    </label>
    <label className="wide">What would you like done?<textarea name="details" placeholder="Tell us about your yard, the work you have in mind, and anything we should know about access." minLength={10} maxLength={3000} rows={3} required/>
    </label>
    <label className="wide">Preferred language<select name="language">
    <option>English</option>
    <option>Spanish</option>
    </select>
    </label>
    </div>{kind === 'visit' && <div className="booking-block">
        <h4>Your preferred visit</h4>
        <MonthPicker value={date} onChange={setDate}/>
        <fieldset className="time-windows">
        <legend>Preferred time of day</legend>{['Morning', 'Afternoon'].map(w => <label key={w}>
            <input type="radio" name="time" value={w} checked={window === w} onChange={() => setWindow(w)}/>{w}</label>)}</fieldset>
        <p className="fine-print">Dates are preferences, not live availability. All visits require confirmation. Time zone: Eastern.</p>
        </div>}<div className="honey" aria-hidden="true">
    <label>Website<input name="website" tabIndex={-1} autoComplete="off"/>
    </label>
    </div>
    <label className="consent">
    <input name="consent" type="checkbox" required/>
    <span>I agree that S&A Lawn Care may contact me about this request. <a href="/privacy">Privacy notice</a>
    </span>
    </label>{error && <p className="error" role="alert">{error}</p>}<button className="button dark submit" disabled={busy}>{busy ? <>
        <LoaderCircle size={18} className="spin"/>Saving your request…</> : <>{kind === 'quote' ? 'Request my quote' : 'Request my visit'}<ArrowUpRight size={20}/>
        </>}</button>
    <p className="fine-print center">No payment required. We’ll discuss your project first.</p>
    </div>
    </form>;
}
export default function Home() {
    const [menu, setMenu] = useState(false);
    const [active, setActive] = useState(0);
    const [kind, setKind] = useState<'quote' | 'visit'>('quote');
    const [selected, setSelected] = useState<string[]>([]);
    const [faq, setFaq] = useState<number | null>(0);
    useEffect(() => {
        const observer = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        }), { threshold: .08 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        document.documentElement.classList.add('motion-ready');
        return () => { observer.disconnect(); document.documentElement.classList.remove('motion-ready'); };
    }, []);
    const request = (type: 'quote' | 'visit', service?: string) => {
        setKind(type);
        if (service)
            setSelected(v => v.includes(service) ? v : [...v, service]);
        setMenu(false);
        document.getElementById('contact')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
    const ActiveIcon = icons[active];
    return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="topbar">
    <span>RESIDENTIAL / COMMERCIAL</span>
    <span>{business.languages}<i /> Established 2026</span>
    </div>
    <header className="site-header">
    <div className="nav-wrap">
    <Brand />
    <nav aria-label="Main navigation" className={menu ? 'nav open' : 'nav'}>
    <a onClick={() => setMenu(false)} href="#services">Our services</a>
    <a onClick={() => setMenu(false)} href="#about">About S&A</a>
    <a onClick={() => setMenu(false)} href="#process">How it works</a>
    <a onClick={() => setMenu(false)} href="#reviews">Reviews</a>
    <a onClick={() => setMenu(false)} href="#contact">Contact</a>
    </nav>
    <div className="nav-actions">
    <a className="nav-phone" href={'tel:' + business.phoneHref}>
    <Phone size={15}/>{business.phone}</a>
    <button className="button dark small" onClick={() => request('quote')}>Get a quote <ArrowUpRight size={16}/>
    </button>
    <button className="menu-toggle" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
    </div>
    </div>
    </header>
    <main id="main">
    <section className="hero" id="home">
    <img className="hero-image" src="/assets/hero.webp" alt="A sunlit green lawn bordered by mature trees and garden beds" fetchPriority="high"/>
    <div className="hero-shade"/>
    <div className="container hero-content">
    <span className="eyebrow light">
    <span className="tiny-line"/>GOOD YARDS. GREAT FIRST IMPRESSIONS.</span>
    <h1>Your outdoors.<br />Our expertise.<br />
    <em>A fresh start.</em>
    </h1>
    <p>From a clean cut to a complete refresh.<br />Lawn, tree, and landscape care that brings<br className="desktop"/> out the best in your home.</p>
    <div className="hero-buttons">
    <button className="button yellow" onClick={() => request('quote')}>Let’s talk about your yard <ArrowUpRight size={19}/>
    </button>
    <a href="#services" className="text-link">Explore our services <ArrowDown size={16}/>
    </a>
    </div>
    <div className="hero-note">
    <Check size={16}/> Residential &amp; commercial care <span /> Owner operated <span /> Se habla español</div>
    </div>
    <div className="hero-bottom">
    <span>YARD WORK, DONE RIGHT.</span>
    <a href="#services">A better yard starts here <span className="round-arrow">
    <ArrowDown size={17}/>
    </span>
    </a>
    </div>
    <div className="hero-stamp">
    <img src="/assets/sa-logo.png" alt="S&A Lawn Care" width="100" height="45"/>
    <span>A CLEANER,<br />GREENER TOMORROW.</span>
    </div>
    </section>
    <div className="service-ribbon">
    <span>
    <Scissors />Lawn care</span>
    <i />
    <span>
    <Trees />Tree service</span>
    <i />
    <span>
    <Droplets />Pressure washing</span>
    <i />
    <span>
    <Leaf />Landscaping</span>
    </div>
    <section className="section services container" id="services">
    <div className="section-heading reveal">
    <div>
    <span className="eyebrow">A LITTLE HELP OUTSIDE</span>
    <h2>One home.<br />
    <em>Every outdoor detail.</em>
    </h2>
    </div>
    <p>Your lawn is just the beginning. Explore the ways we can help your whole property look its best.</p>
    </div>
    <div className="service-tabs reveal" role="tablist" aria-label="Our services">{services.map((s, i) => {
            const Icon = icons[i];
            return <button role="tab" aria-selected={active === i} aria-controls={'service-panel-' + i} id={'service-tab-' + i} key={s.id} className={active === i ? 'active' : ''} onClick={() => setActive(i)}>
            <span className="service-number">0{i + 1}</span>
            <Icon size={27}/>
            <h3>{s.name}</h3>
            <p>{s.short}</p>
            <span className="service-explore">Explore service <ArrowUpRight size={19}/>
            </span>
            </button>;
        })}</div>
    <div className="service-detail" role="tabpanel" key={active} id={'service-panel-' + active} aria-labelledby={'service-tab-' + active}>
    <div className="detail-graphic">
    <ActiveIcon size={100} strokeWidth={.9}/>
    <span>{active === 0 ? 'A CUT ABOVE.' : active === 1 ? 'ROOM TO GROW.' : active === 2 ? 'A CLEAN SLATE.' : 'THE FINISHING TOUCH.'}</span>
    <div className="graphic-ring r1"/>
    <div className="graphic-ring r2"/>
    </div>
    <div className="detail-copy">
    <span className="eyebrow">{services[active].name}</span>
    <h3>{services[active].intro}</h3>
    <ul>{services[active].items.map(item => <li key={item}>
        <Check size={15}/>{item}</li>)}</ul>
    <p>{services[active].note}</p>
    <button className="inline-button" onClick={() => request('quote', services[active].id)}>Get a {active === 1 ? 'tree service' : services[active].name.toLowerCase()} quote <ArrowUpRight size={19}/>
    </button>
    </div>
    </div>
    </section>
    <LawnReveal />
    <section className="about section container" id="about">
    <div className="about-visual reveal">
    <img src="/assets/garden.webp" alt="Illustrative view of a lush residential garden" loading="lazy"/>
    <div className="about-label">
    <img src="/assets/sa-logo.png" className="about-logo" alt="S&A Lawn Care" width="92" height="41"/>
    <span>Good people.<br />
    <b>Good-looking yards.</b>
    </span>
    </div>
    <span className="image-caption">Landscape inspiration</span>
    </div>
    <div className="about-copy reveal">
    <span className="eyebrow">THE PERSON BEHIND THE WORK</span>
    <h2>Your yard.<br />
    <em>Erik’s personal touch.</em>
    </h2>
    <p>{business.about}</p>
    <p>Whether it’s regular upkeep or a fresh start outside, tell Erik what you have in mind. It starts with a conversation and a plan for your property.</p>
    <div className="owner-signature">
    <span className="owner-monogram">EA</span>
    <div>
    <b>{business.owner}</b>
    <span>Owner / Operator · S&A Lawn Care</span>
    </div>
    </div>
    <a className="inline-button" href={'tel:' + business.phoneHref}>Say hello to Erik <ArrowUpRight size={19}/>
    </a>
    </div>
    </section>
    <section className="process-section" id="process">
    <div className="container">
    <div className="section-heading reveal">
    <div>
    <span className="eyebrow light">LESS HASSLE. MORE OUTSIDE.</span>
    <h2>A better yard.<br />
    <em>A simple way to get there.</em>
    </h2>
    </div>
    <button className="button yellow" onClick={() => request('visit')}>Find your fresh start <ArrowUpRight size={18}/>
    </button>
    </div>
    <div className="steps">{[['01', 'Tell us about your space.', 'Share your address, approximate property size, and the work you’d like done.'], ['02', 'Let’s make a plan.', 'Request a visit day. Erik will discuss the details, quote, and availability with you.'], ['03', 'Enjoy the difference.', 'Once everything is confirmed, let S&A take care of the work so you can enjoy your outdoors.']].map(([n, title, desc]) => <div className="step reveal" key={n}>
        <span>{n}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
        </div>)}</div>
    </div>
    </section>
    <Reviews />
    <section className="contact-section section container" id="contact">
    <div className="contact-copy reveal">
    <span className="eyebrow">LET’S GET SOMETHING GROWING</span>
    <h2>A fresh start<br />is <em>one hello away.</em>
    </h2>
    <p>A quick cleanup? A lawn that needs some love? Tell us what you’re thinking. We’ll take it from there.</p>
    <div className="contact-method">
    <span className="contact-icon">
    <Phone size={23}/>
    </span>
    <div>
    <small>CALL ERIK DIRECTLY</small>
    <a href={'tel:' + business.phoneHref}>{business.phone}</a>
    </div>
    </div>
    <div className="contact-method">
    <span className="contact-icon">
    <MessageCircle size={23}/>
    </span>
    <div>
    <small>MORE OF A TEXTER?</small>
    <a className="contact-text" href={'sms:' + business.phoneHref}>Send a text <ArrowUpRight size={17}/>
    </a>
    </div>
    </div>
    <div className="contact-method">
    <span className="contact-icon">
    <MapPin size={23}/>
    </span>
    <div>
    <small>RESIDENTIAL / COMMERCIAL</small>
    <p>{business.serviceArea}</p>
    </div>
    </div>
    <div className="spanish-note">
    <span>Hola.</span>
    <div>
    <b>Se habla español.</b>
    <p>Let’s talk in the language you’re comfortable with.</p>
    </div>
    </div>
    <div className="contact-footnote">
    <Leaf size={16}/> A cleaner, greener tomorrow starts here.</div>
    </div>
    <RequestForm kind={kind} setKind={setKind} selected={selected} setSelected={setSelected}/>
    </section>
    <section className="faq-section section container">
    <div className="reveal">
    <span className="eyebrow">A FEW GOOD QUESTIONS</span>
    <h2>Good to know.<br />
    <em>Before we mow.</em>
    </h2>
    </div>
    <div className="faq-list">{faqs.map(([q, a], i) => <div className="faq-item" key={q}>
        <button aria-expanded={faq === i} aria-controls={'faq-' + i} onClick={() => setFaq(faq === i ? null : i)}>{q}{faq === i ? <Minus size={18}/> : <Plus size={18}/>}</button>
        <div id={'faq-' + i} hidden={faq !== i}>
        <p>{a}</p>
        </div>
        </div>)}</div>
    </section>
    <section className="closing">
    <img src="/assets/sa-logo.png" className="closing-logo" alt="S&A Lawn Care" width="160" height="72"/>
    <p>A little greener.<br />
    <em>A whole lot better.</em>
    </p>
    <button className="button dark" onClick={() => request('quote')}>Let’s get started <ArrowUpRight size={19}/>
    </button>
    </section>
    </main>
    <footer>
    <div className="footer-top container">
    <Brand />
    <span>Lawn care. Tree service. A fresh perspective.</span>
    <a href={'tel:' + business.phoneHref}>{business.phone}<ArrowUpRight size={20}/>
    </a>
    </div>
    <div className="footer-bottom container">
    <span>© {new Date().getFullYear()} S&A Lawn Care. All rights reserved.</span>
    <div>
    <a href="/privacy">Privacy</a>
    <a href="#home">Back to top ↑</a>
    </div>
    </div>
    </footer>
    <div className="mobile-cta">
    <a href={'tel:' + business.phoneHref}>
    <Phone size={17}/>Call Erik</a>
    <button onClick={() => request('quote')}>Get a quote <ArrowUpRight size={17}/>
    </button>
    </div>
    </>;
}
