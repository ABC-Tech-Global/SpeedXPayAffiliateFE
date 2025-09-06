// Prefer server-only API_URL if present; fall back to NEXT_PUBLIC_API_URL for flexibility.
const isProd = process.env.NODE_ENV === "production";
const fromEnv = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").trim();
if (!fromEnv && isProd) {
  throw new Error("API_URL or NEXT_PUBLIC_API_URL must be set in production");
}
const rawApiUrl = (fromEnv || "http://localhost:4000").trim();
export const API_URL = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;
