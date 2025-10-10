import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/config";

function buildErrorResponse(data: unknown, status: number, fallback: string) {
  if (data && typeof data === "object") {
    return NextResponse.json(data, { status });
  }
  return NextResponse.json({ error: fallback }, { status });
}

function ensureFormDataFromJson(json: unknown): FormData {
  const form = new FormData();
  if (json && typeof json === "object") {
    const record = json as Record<string, unknown>;
    const bankType =
      typeof record.BankType === "number"
        ? record.BankType
        : typeof record.BankType === "string" && record.BankType.trim()
          ? Number.parseInt(record.BankType, 10)
          : typeof record.bankType === "number"
            ? record.bankType
            : typeof record.bankType === "string" && record.bankType.trim()
              ? Number.parseInt(record.bankType, 10)
              : undefined;
    if (typeof bankType === "number" && Number.isFinite(bankType)) form.set("BankType", String(bankType));

    const accountType =
      typeof record.AccountType === "number"
        ? record.AccountType
        : typeof record.AccountType === "string" && record.AccountType.trim()
          ? Number.parseInt(record.AccountType, 10)
          : typeof record.accountType === "number"
            ? record.accountType
            : typeof record.accountType === "string" && record.accountType.trim()
              ? Number.parseInt(record.accountType, 10)
              : undefined;
    form.set("AccountType", String(accountType ?? 3));

    const accountName =
      typeof record.AccountName === "string" && record.AccountName.trim()
        ? record.AccountName.trim()
        : typeof record.accountName === "string" && record.accountName.trim()
          ? record.accountName.trim()
          : "";
    if (accountName) form.set("AccountName", accountName);

    const accountNumber =
      typeof record.AccountNumber === "string" && record.AccountNumber.trim()
        ? record.AccountNumber.trim()
        : typeof record.accountNumber === "string" && record.accountNumber.trim()
          ? record.accountNumber.trim()
          : "";
    if (accountNumber) form.set("AccountNumber", accountNumber);
  }

  if (!form.has("AccountType")) form.set("AccountType", "3");
  return form;
}

function ensureOptionalEmptyFields(form: FormData) {
  const optionalKeys = ["LoginId", "Password", "SecurityCode", "BankAccountBalance"];
  optionalKeys.forEach((key) => {
    if (!form.has(key)) form.set(key, "");
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const twofa = request.headers.get("x-2fa-code") || "";
  const contentType = request.headers.get("content-type") || "";

  let form: FormData;
  if (contentType.includes("multipart/form-data")) {
    form = await request.formData();
  } else if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => ({}));
    form = ensureFormDataFromJson(json);
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text().catch(() => "");
    const params = new URLSearchParams(text);
    form = new FormData();
    params.forEach((value, key) => {
      form.append(key, value);
    });
  } else {
    form = new FormData();
  }

  if (!form.has("AccountType")) form.set("AccountType", "3");
  ensureOptionalEmptyFields(form);

  const endpoint = new URL("/api/BankAccount/createaffbank", API_URL).toString();
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
    return buildErrorResponse(data, res.status, "Failed to create bank account");
  }

  return NextResponse.json(data ?? {}, { status: res.status });
}
