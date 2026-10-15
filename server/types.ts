export interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    APP_URL: string;
    ADMIN_EMAIL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    TOKEN_ENCRYPTION_KEY: string;
    GOOGLE_CALENDAR_ID: string;
    RESEND_API_KEY: string;
    EMAIL_FROM: string;
}
export type RequestRow = {
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
    revision: number;
};
export type Job = {
    id: string;
    kind: string;
    entity_id: string;
    payload: string;
    attempts: number;
    lease: string | null;
    state: string;
    next_attempt: number;
    last_error: string | null;
};
