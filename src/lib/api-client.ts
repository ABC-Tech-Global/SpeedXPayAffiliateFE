export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* ignore non-json */ }
  if (!res.ok) {
    const obj = (data as Record<string, unknown>) || {};
    const msg = (typeof obj.error === 'string' && obj.error)
      || (typeof obj.message === 'string' && obj.message)
      || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return (data as T) ?? ({} as T);
}
