import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username || "");
    const password = String(body?.password || "");
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
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV !== "development",
      path: "/",
      maxAge: oneDay,
    });

    return NextResponse.json({ ok: true, passwordResetRequired: Boolean(data?.passwordResetRequired) });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
