import Brand from './Brand';
import { business } from './site-content';
export const metadata = { title: 'Privacy | S&A Lawn Care' };
export default function Privacy() {
    return <main className="legal"><Brand />
    <a href="/">← Back to S&A Lawn Care</a>
    <h1>Your information,<br />handled with care.</h1>
    <p>This notice explains how this S&A Lawn Care website uses the information you choose to share.</p>
    <h2>Quote and visit requests</h2>
    <p>We collect your name, contact information, property address, approximate size, service needs, language preference, and any requested visit date. This helps S&A review your project, respond to you, and manage scheduling. Sending a request does not confirm an appointment or create a payment obligation.</p>
    <h2>Customer reviews</h2>
    <p>We collect your display name, email, rating, selected service, and review. Your display name, service, rating, and review may be published after moderation. Your email is visible only to the authorized site administrator. Please do not include addresses, phone numbers, or other private information in your review.</p>
    <h2>Storage and access</h2>
    <p>Submissions are stored in the website’s database and can be accessed by the authorized administrator. Cloudflare hosts the website and its D1 database. Google processes owner sign-in and stores visit details in the owner’s chosen Google Calendar. Resend processes transactional email delivery, including customer acknowledgments and owner notifications. The site does not sell your submitted information or use it to build advertising profiles. Visit dates and contact details are sent to the owner’s Google Calendar. If the owner exports a calendar file, visit details are also included in that export.</p>
    <h2>Security and spam prevention</h2>
    <p>The website uses short-lived hashed identifiers to limit abusive submissions. Hosting services may keep operational and security logs. Owner sign-in uses Google. A secure session cookie remembers the signed-in owner; calendar authorization is stored encrypted on the server. Requests are kept while needed for service and business records. Contact us to request removal. No optional advertising or analytics trackers have been added to this website.</p>
    <h2>Questions or removal requests</h2>
    <p>Contact Erik Amador at <a href={'tel:' + business.phoneHref}>{business.phone}</a> to ask about information you submitted, request a correction, or request removal of a review or personal details.</p>
    </main>;
}
