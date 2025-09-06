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
    headers: init.body instanceof FormData
      ? init.headers
      : {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
  });
  console.log(`apiFetch: Response status for ${input}: ${res.status}`);
  let data: unknown = null;
  try {
    data = await res.json();
    console.log(`apiFetch: Parsed JSON data for ${input}:`, data);
  } catch (e) {
    console.warn(`apiFetch: Failed to parse JSON for ${input}:`, e);
  }
  if (!res.ok) {
    const obj = (data as Record<string, unknown>) || {};
    const msg = (typeof obj.error === 'string' && obj.error)
      || (typeof obj.message === 'string' && obj.message)
      || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return (data as T) ?? ({} as T);
}
