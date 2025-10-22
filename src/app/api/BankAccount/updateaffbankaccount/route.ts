import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_URL } from "@/lib/config";

function buildErrorResponse(data: unknown, status: number, fallback: string) {
  if (data && typeof data === "object") {
    return NextResponse.json(data, { status });
  }
  return NextResponse.json({ error: fallback }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const twofa = request.headers.get("x-2fa-code") || undefined;
  const form = await request.formData();

  const endpoint = new URL("/api/BankAccount/updateaffbankaccount", API_URL).toString();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      ...(twofa ? { "x-2fa-code": twofa } : {}),
    },
    body: form,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return buildErrorResponse(data, res.status, "Failed to update bank account");
  }

  return NextResponse.json(data ?? {}, { status: res.status });
}
