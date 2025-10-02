import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { API_URL } from "@/lib/config";
import { ForceResetPasswordSchema, parseJson, validationError } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  try {
    const body = await parseJson(request, ForceResetPasswordSchema);
    const endpoint = new URL("/api/affiliate/forceresetpassword", API_URL).toString();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "Unable to update password";
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const nextToken = typeof data?.token === "string"
      ? data.token
      : typeof data?.data?.token === "string"
        ? data.data.token
        : typeof data?.accessToken === "string"
          ? data.accessToken
          : typeof data?.data?.accessToken === "string"
            ? data.data.accessToken
            : null;

    const hdrs = await headers();
    const proto = (hdrs.get("x-forwarded-proto") || new URL(request.url).protocol || "").toString();
    const isHttps = proto.includes("https");
    const response = NextResponse.json({ ok: true });

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isHttps,
      path: "/",
    };

    if (nextToken) {
      response.cookies.set("token", nextToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24,
      });
    }

    response.cookies.set("first_login_complete", "1", {
      ...cookieOptions,
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    if (err instanceof ZodError) return validationError(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
