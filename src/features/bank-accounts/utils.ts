import type { AffiliateBankOption, CreateAffiliateBankResponse } from "./types";

function parseStatus(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const SUCCESS_STATUS_CODES = new Set([200, 9001, 9039]);
const SUCCESS_CODES = new Set([200]);

function messageLooksSuccessful(message: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes("success")) return true;
  const deduped = lower.replace(/([a-z])\1{2,}/g, "$1$1");
  return deduped.includes("success");
}

export function normalizeAffiliateBankOptions(payload: unknown): AffiliateBankOption[] {
  const seen = new Set<number>();
  const result: AffiliateBankOption[] = [];

  const enqueue = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const name =
      typeof record.affiliateBankName === "string" && record.affiliateBankName.trim()
        ? record.affiliateBankName.trim()
        : typeof record.bankName === "string" && record.bankName.trim()
          ? record.bankName.trim()
          : typeof record.BankName === "string" && record.BankName.trim()
            ? record.BankName.trim()
            : typeof record.name === "string" && record.name.trim()
              ? record.name.trim()
              : "";

    const typeRaw =
      record.affiliateBankType ??
      record.bankType ??
      record.BankType ??
      record.type ??
      record.id ??
      record.ID ??
      record.value;

    const type =
      typeof typeRaw === "number"
        ? typeRaw
        : typeof typeRaw === "string" && typeRaw.trim()
          ? Number.parseInt(typeRaw, 10)
          : NaN;

    if (!name || Number.isNaN(type) || seen.has(type)) return;
    seen.add(type);
    result.push({ name, type });
  };

  const visit = (value: unknown, visited = new Set<unknown>()) => {
    if (!value || visited.has(value)) return;
    if (typeof value === "object") visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(enqueue);
      return;
    }
    if (typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    visit(record.banks, visited);
    visit(record.payout, visited);
    visit(record.items, visited);
    visit(record.list, visited);
    visit(record.data, visited);
  };

  visit(payload);
  return result;
}

type CreateResponseEvaluation = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    accountName?: string;
    accountNumber?: string;
    twofa?: string;
  };
};

export function evaluateCreateAffiliateBankResponse(response: CreateAffiliateBankResponse | undefined): CreateResponseEvaluation {
  if (!response || typeof response !== "object") {
    return { success: false, message: "Unexpected response from server" };
  }

  const status = parseStatus(response.statusCode);
  const code = parseStatus(response.code);
  const message = typeof response.message === "string" ? response.message.trim() : "";
  const data = Array.isArray(response.data) ? response.data : [];
  const messages = data.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const statusSignalsSuccess = status === undefined || SUCCESS_STATUS_CODES.has(status);
  const codeSignalsSuccess = code === undefined || SUCCESS_CODES.has(code);
  const messageSignalsSuccess = !message || messageLooksSuccessful(message);
  const hasInlineMessages = messages.length > 0;

  const looksSuccessful = statusSignalsSuccess && codeSignalsSuccess && messageSignalsSuccess && !hasInlineMessages;

  if (looksSuccessful) {
    return { success: true, message: message || undefined };
  }

  const combinedMessage = messages[0] || message || "Failed to add bank details";
  const lower = combinedMessage.toLowerCase();

  const fieldErrors: CreateResponseEvaluation["fieldErrors"] = {};
  if (lower.includes("accountname") || lower.includes("account name")) {
    fieldErrors.accountName = combinedMessage;
  } else if (lower.includes("accountnumber") || lower.includes("account number")) {
    fieldErrors.accountNumber = combinedMessage;
  } else if (lower.includes("2fa")) {
    fieldErrors.twofa = "Invalid 2FA code. Please try again.";
  }

  return {
    success: false,
    message: combinedMessage,
    fieldErrors,
  };
}

export function parseStatusCode(value: unknown): number | undefined {
  return parseStatus(value);
}
