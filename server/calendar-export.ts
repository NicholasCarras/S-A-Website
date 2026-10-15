export function escapeICS(s: string) { return s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,'); }
// RFC 5545: fold long content lines without splitting UTF-8 characters.
export function foldICS(line: string) {
    let result = '', size = 0;
    for (const character of line) {
        const bytes = new TextEncoder().encode(character).length;
        if (size + bytes > 75) {
            result += '\r\n ';
            size = 1;
        }
        result += character;
        size += bytes;
    }
    return result;
}
export function calendarText(rows: any[]) { return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SA Lawn Care//Visits//EN', 'CALSCALE:GREGORIAN', ...rows.filter(r => r.preferred_date && r.status !== 'declined').flatMap(r => ['BEGIN:VEVENT', `UID:${r.id}@sa-lawn-care`, `DTSTAMP:${new Date(r.created_at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${r.preferred_date.replace(/-/g, '')}`, `SUMMARY:${escapeICS(`[${r.status}] ${r.name} — ${r.time_window}`)}`, `LOCATION:${escapeICS(`${r.address}, ${r.city} ${r.postal}`)}`, `DESCRIPTION:${escapeICS(`${r.phone}\n${r.details}\n${r.time_window}. Visit requests require confirmation.`)}`, `STATUS:${r.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'}`, 'END:VEVENT']), 'END:VCALENDAR', ''].map(foldICS).join('\r\n'); }
