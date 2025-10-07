import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { API_URL } from "@/lib/config";
import { LoginSchema, parseJson, validationError } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(req: Request) {
  try {
    const { username, password } = await parseJson(req, LoginSchema);
    const endpoint = new URL('/api/affiliate/login', API_URL).toString();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = typeof data?.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : "Invalid credentials";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const token = typeof data?.token === 'string'
      ? data.token
      : typeof data?.accessToken === 'string'
        ? data.accessToken
        : typeof data?.data?.token === 'string'
          ? data.data.token
          : typeof data?.data?.accessToken === 'string'
            ? data.data.accessToken
            : null;

    if (!token) {
      return NextResponse.json({ error: "Login succeeded but no token was returned" }, { status: 502 });
    }
    const oneDay = 60 * 60 * 24;
    const hdrs = await headers();
    const proto = (hdrs.get('x-forwarded-proto') || new URL(req.url).protocol || '').toString();
    const isHttps = proto.includes('https');
    const passwordResetRequired = Boolean(
      data?.passwordResetRequired
        ?? data?.data?.passwordResetRequired
        ?? data?.meta?.passwordResetRequired
        ?? data?.isFirstLogin
        ?? data?.data?.isFirstLogin
        ?? data?.meta?.isFirstLogin,
    );
    const json = NextResponse.json({ ok: true, passwordResetRequired });
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isHttps,
      path: "/",
    };
    json.cookies.set("token", token, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: oneDay,
    });
    if (passwordResetRequired) {
      json.cookies.set("first_login_complete", "", {
        ...cookieOptions,
        maxAge: 0,
      });
    } else {
      json.cookies.set("first_login_complete", "1", {
        ...cookieOptions,
        maxAge: oneDay,
      });
    }
    return json;
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
