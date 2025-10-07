import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST() {
  const hdrs = await headers();
  const proto = (hdrs.get('x-forwarded-proto') || '').toString();
  const isHttps = proto.includes('https');
  const json = NextResponse.json({ ok: true });
  json.cookies.set("token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
  });
  json.cookies.set("first_login_complete", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
  });
  return json;
}
