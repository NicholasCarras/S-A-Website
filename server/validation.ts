import { z } from 'zod';
import { business } from '../src/site-content.ts';
export function localDate(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: business.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
export const requestSchema = z.object({
    id: z.string().uuid(), kind: z.enum(['quote', 'visit']), name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), phone: z.string().trim().min(7).max(30).regex(/^[+()\d\s.\-]+$/), address: z.string().trim().min(4).max(200), city: z.string().trim().min(2).max(100), postal: z.string().trim().regex(/^\d{5}(-\d{4})?$/), area: z.string().trim().min(1).max(80), services: z.array(z.enum(['lawn', 'tree', 'wash', 'landscape'])).min(1).max(4), details: z.string().trim().min(10).max(3000), language: z.enum(['English', 'Spanish']), frequency: z.enum(['One-time', 'Recurring', 'Not sure']), preferredDate: z.string().nullable(), window: z.enum(['Morning', 'Afternoon']).nullable(), website: z.string().max(0), consent: z.literal(true)
}).superRefine((v, ctx) => {
    if (v.kind === 'visit' && (!v.preferredDate || !v.window))
        ctx.addIssue({ code: 'custom', message: 'Choose a preferred day and time window.' });
    if (v.preferredDate) {
        const d = new Date(v.preferredDate + 'T12:00:00Z');
        const latest = localDate(new Date(Date.now() + business.bookingHorizonDays * 86400000));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v.preferredDate) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v.preferredDate || v.preferredDate <= localDate() || v.preferredDate > latest)
            ctx.addIssue({ code: 'custom', message: 'Choose a future day within the next six months.' });
    }
});
export const reviewSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), service: z.enum(['lawn', 'tree', 'wash', 'landscape']), rating: z.number().int().min(1).max(5), body: z.string().trim().min(15).max(1200), consent: z.literal(true), website: z.string().max(0) });
export const statusSchema = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'confirmed', 'completed', 'declined']), preferredDate: z.string().optional(), window: z.enum(['Morning', 'Afternoon']).optional() });
export const reviewStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'approved', 'hidden']) });
