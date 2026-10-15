// Edit business details, service copy, and booking settings here.
export const business = {
    name: 'S&A Lawn Care', owner: 'Erik Amador', phone: '706-847-1924', phoneHref: '+17068471924',
    tagline: 'Yard work, done right.', languages: 'Se habla español.',
    serviceArea: 'Contact Erik to check service in your area.',
    about: 'S&A Lawn Care is an owner-operated business serving residential and commercial properties. Erik Amador brings lawn care, small-tree services, pressure washing, and landscaping together in one place, so taking care of your outside space feels simple.',
    timezone: 'America/New_York', bookingHorizonDays: 180,
    morningHour: 9, afternoonHour: 13, visitHours: 2,
};
export const services = [
    { id: 'lawn', name: 'Lawn care', short: 'A fresh cut. A clean edge. A yard you love coming home to.', intro: 'From the first mow to ongoing upkeep, give your lawn the attention it deserves.', items: ['Mowing', 'Edging & weed eating', 'Yard cleanups', 'Ongoing maintenance'], note: 'Tell us your lawn size and whether you need a one-time visit or recurring care.', icon: 'grass', image: '/assets/lawn.webp' },
    { id: 'tree', name: 'Tree & brush care', short: 'Make room for a lighter, brighter outdoor space.', intro: 'Practical care for smaller trees and overgrown brush around your property.', items: ['Small-tree service', 'Tree trimming', 'Smaller-tree removal', 'Brush cleanup'], note: 'Tree size, location, access, and nearby structures help Erik assess the scope. Larger or hazardous trees require a separate specialist.', icon: 'tree', image: '/assets/tree.webp' },
    { id: 'wash', name: 'Pressure washing', short: 'Let the original beauty of your home shine through.', intro: 'Refresh the hard-working surfaces around your home with a cleanup suited to the project.', items: ['Driveways & walkways', 'Patios', 'Decks', 'Siding & more'], note: 'Share the surface material, approximate area, and any delicate or damaged spots for a tailored quote.', icon: 'water', image: '/assets/wash.webp' },
    { id: 'landscape', name: 'Shrubs & landscaping', short: 'It’s the finishing touches that make it feel like home.', intro: 'Bring definition, color, and a well-kept look back to your beds and borders.', items: ['Shrub trimming', 'Mulching', 'Pine straw', 'Bed cleanup & curb appeal'], note: 'Tell us which beds or shrubs need attention and whether you prefer mulch or pine straw.', icon: 'leaf', image: '/assets/landscape.webp' },
] as const;
export const faqs = [
    ['What services can I combine?', 'You can request lawn care, small-tree work, pressure washing, and landscaping together. Select all the services you need in the quote form and Erik can review the full project.'],
    ['Does picking a day confirm my appointment?', 'Picking a day sends a visit request. Erik will contact you to confirm the scope, service area, price, and availability before the visit is booked.'],
    ['Do I need to know the exact size of my property?', 'An estimate is fine. You can enter acres or square feet, or choose “Not sure.” Your address and a description of the work help us take the next step.'],
    ['Do you remove large trees?', 'The services listed here cover smaller trees and brush. Describe the height, access, and location in your request so Erik can determine whether the job is within scope.'],
    ['Can I request service in Spanish?', 'Sí. Se habla español. Call or text Erik at 706-847-1924, or select Spanish as your preferred language in the form.'],
];
