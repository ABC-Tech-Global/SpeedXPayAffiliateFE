import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/config";

function buildErrorResponse(data: unknown, status: number, fallback: string) {
  if (data && typeof data === "object") {
    return NextResponse.json(data, { status });
  }
  return NextResponse.json({ error: fallback }, { status });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const endpoint = new URL("/api/BankAccount/getaffbanklist", API_URL).toString();
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return buildErrorResponse(data, res.status, "Failed to load bank list");
  }

  return NextResponse.json(data ?? []);
}
