import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_URL } from "@/lib/config";

function buildErrorResponse(data: unknown, status: number, fallback: string) {
  if (data && typeof data === "object") {
    return NextResponse.json(data, { status });
  }
  return NextResponse.json({ error: fallback }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bankId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  const { bankId } = await params;
  const endpoint = new URL(`/api/BankAccount/deleteaffbankaccount/${encodeURIComponent(bankId)}`, API_URL).toString();

  const res = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    // Upstream endpoint accepts an empty JSON body; send minimal payload.
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return buildErrorResponse(data, res.status, "Failed to delete bank account");
  }

  return NextResponse.json(data ?? { success: true });
}
