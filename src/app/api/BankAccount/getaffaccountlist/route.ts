import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_URL } from "@/lib/config";

type RawBody = {
  accountType?: unknown;
  isActive?: unknown;
  pageIndex?: unknown;
  pageSize?: unknown;
};

type AccountListPayload = {
  accountType: number;
  isActive: number;
  pageIndex: number;
  pageSize: number;
};

const DEFAULT_PAYLOAD: AccountListPayload = {
  accountType: 3,
  isActive: 0,
  pageIndex: 0,
  pageSize: 5,
};

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function buildPayload(body: unknown): AccountListPayload {
  if (!body || typeof body !== "object") return DEFAULT_PAYLOAD;
  const raw = body as RawBody;
  return {
    accountType: toNumber(raw.accountType, DEFAULT_PAYLOAD.accountType),
    isActive: toNumber(raw.isActive, DEFAULT_PAYLOAD.isActive),
    pageIndex: toNumber(raw.pageIndex, DEFAULT_PAYLOAD.pageIndex),
    pageSize: toNumber(raw.pageSize, DEFAULT_PAYLOAD.pageSize),
  };
}

function buildErrorResponse(data: unknown, status: number, fallback: string) {
  if (data && typeof data === "object") {
    return NextResponse.json(data, { status });
  }
  return NextResponse.json({ error: fallback }, { status });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  let payload: AccountListPayload = DEFAULT_PAYLOAD;
  try {
    const body = await request.json();
    payload = buildPayload(body);
  } catch {
    payload = DEFAULT_PAYLOAD;
  }

  const endpoint = new URL("/api/BankAccount/getaffaccountlist", API_URL).toString();
  const res = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return buildErrorResponse(data, res.status, "Failed to load bank accounts");
  }

  return NextResponse.json(data ?? { data: [] });
}
