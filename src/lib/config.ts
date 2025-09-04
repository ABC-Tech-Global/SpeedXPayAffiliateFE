// Prefer server-only API_URL if present; fall back to NEXT_PUBLIC_API_URL for flexibility.
const rawApiUrl = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").trim();
export const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;

