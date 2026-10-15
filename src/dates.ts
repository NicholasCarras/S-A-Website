import { business } from './site-content';
export function localDate(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: business.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
