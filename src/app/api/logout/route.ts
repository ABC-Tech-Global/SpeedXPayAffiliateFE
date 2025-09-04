import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Clear the auth cookie
  const cookieStore = await cookies();
  cookieStore.set("token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
  });
  return NextResponse.json({ ok: true });
}
