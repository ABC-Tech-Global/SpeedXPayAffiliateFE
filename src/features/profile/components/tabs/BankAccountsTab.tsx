"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { apiFetch } from "@/lib/api-client";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";
import { AddBankDialogButton } from "@/features/bank-accounts/components/AddBankDialogButton";
import { useAffiliateBankOptions } from "@/features/bank-accounts/hooks/useAffiliateBankOptions";

type AffiliateAccount = {
  id: number;
  bankType: number;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  bankLabel?: string;
};

const MAX_ACCOUNTS = 5;
const ACCOUNT_LIST_REQUEST = {
  accountType: 3,
  isActive: 0,
  pageIndex: 0,
  pageSize: 5,
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "active";
  }
  return false;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAffiliateAccounts(payload: unknown): AffiliateAccount[] {
  const container = payload && typeof payload === "object"
    ? (payload as { data?: unknown })
    : undefined;
  const source = Array.isArray(container?.data)
    ? (container!.data as unknown[])
    : Array.isArray(payload)
      ? (payload as unknown[])
      : [];

  const result: AffiliateAccount[] = [];

  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;

    const id = toNumber(record.id ?? record.ID);
    const bankType = toNumber(record.bankType ?? record.BankType ?? record.type);
    const accountName = trimString(record.accountName ?? record.AccountName);
    const accountNumber = trimString(record.accountNumber ?? record.AccountNumber);
    const bankLabel = trimString(record.bank ?? record.bankName ?? record.BankName);
    const isActive = toBoolean(record.isActive ?? record.IsActive ?? record.active);

    if (typeof id === "undefined" || typeof bankType === "undefined") continue;
    if (!accountName || !accountNumber) continue;

    result.push({
      id,
      bankType,
      accountName,
      accountNumber,
      bankLabel: bankLabel || undefined,
      isActive,
    });
  }

  return result;
}

export default function BankAccountsTab() {
  const [accounts, setAccounts] = React.useState<AffiliateAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { withTwofa, DialogUI } = useTwofaPrompt();
  const { options: bankOptions } = useAffiliateBankOptions(true);

  const bankNameByType = React.useMemo(() => {
    const map = new Map<number, string>();
    bankOptions.forEach((option) => {
      map.set(option.type, option.name);
    });
    return map;
  }, [bankOptions]);

  const resolveBankName = React.useCallback((account: AffiliateAccount) => {
    return bankNameByType.get(account.bankType) ?? account.bankLabel ?? `Bank #${account.bankType}`;
  }, [bankNameByType]);

  const loadAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<unknown>("/api/BankAccount/getaffaccountlist", {
        method: "POST",
        body: JSON.stringify(ACCOUNT_LIST_REQUEST),
      });
      const list = normalizeAffiliateAccounts(response).slice(0, MAX_ACCOUNTS);
      setAccounts(list);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const canAddMore = accounts.length < MAX_ACCOUNTS;
  const empty = !loading && accounts.length === 0;

  return (
    <div className="space-y-4">
      {empty ? (
        <div className="rounded-lg border p-6 text-center">
          <div className="text-base font-medium">No bank accounts yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Add a bank account to receive withdrawals. You can add up to {MAX_ACCOUNTS} accounts.</div>
          <div className="mt-4">
            <AddBankDialogButton
              onSuccess={loadAccounts}
              disabled={!canAddMore}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">You can add up to {MAX_ACCOUNTS} bank accounts.</div>
            <AddBankDialogButton
              onSuccess={loadAccounts}
              disabled={!canAddMore}
            />
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2">Bank</th>
                  <th className="px-4 py-2">Account name</th>
                  <th className="px-4 py-2">Account no.</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : accounts).map((account) => (
                  <tr key={account.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{resolveBankName(account)}</td>
                    <td className="px-4 py-2">{account.accountName}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs sm:text-sm">{account.accountNumber}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            try {
                              await withTwofa(async (headers) => {
                                await apiFetch(`/api/bank-accounts/${account.id}`, { method: "DELETE", headers });
                              });
                              toast.success("Bank account removed");
                              await loadAccounts();
                            } catch (err) {
                              if (err instanceof Error && err.message.includes("2fa")) return;
                              toast.error(err instanceof Error ? err.message : "Failed to remove account");
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr>
                    <td className="px-4 py-4 text-muted-foreground" colSpan={3}>Loading…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {DialogUI}
    </div>
  );
}
