import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { API_URL } from "@/lib/config";
import { LoginSchema, parseJson, validationError } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(req: Request) {
  try {
    const { username, password } = await parseJson(req, LoginSchema);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || "Invalid credentials" }, { status: 401 });
    }

    const token: string = data.token;
    const oneDay = 60 * 60 * 24;
    const hdrs = await headers();
    const proto = (hdrs.get('x-forwarded-proto') || new URL(req.url).protocol || '').toString();
    const isHttps = proto.includes('https');
    const json = NextResponse.json({ ok: true, passwordResetRequired: Boolean(data?.passwordResetRequired) });
    json.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: oneDay,
    });
    return json;
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
