"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";

type BankAccount = { id: number; bank_name: string; account_number: string; is_default: boolean };

export default function BankAccountsTab() {
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [twofaEnabled, setTwofaEnabled] = React.useState(false);
  const [twofaCode, setTwofaCode] = React.useState("");
  const [twofaError, setTwofaError] = React.useState("");
  const { withTwofa, DialogUI } = useTwofaPrompt();

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ accounts?: BankAccount[] }>("/api/bank-accounts");
      setAccounts(Array.isArray(res?.accounts) ? res.accounts : []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const d = await apiFetch<{ enabled?: boolean }>("/api/users/2fa");
        if (!alive) return;
        setTwofaEnabled(Boolean(d?.enabled));
      } catch {
        setTwofaEnabled(false);
      }
    })();
    return () => { alive = false };
  }, [open]);

  const canAddMore = accounts.length < 3;
  const empty = !loading && accounts.length === 0;

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canAddMore) return;
    const name = bankName.trim();
    const number = accountNumber.trim();
    if (!name || !number) return;
    setSubmitting(true);
    try {
      if (twofaEnabled && !/^\d{6}$/.test(twofaCode)) {
        setTwofaError('Enter a valid 6‑digit code');
        return;
      }
      const headers = twofaEnabled && twofaCode ? { 'x-2fa-code': twofaCode } : {};
      const res = await apiFetch<{ account?: BankAccount }>("/api/bank-accounts", {
        method: "POST",
        headers,
        body: JSON.stringify({ bankName: name, bankAccountNumber: number, makeDefault: accounts.length === 0 }),
      });
      if (res?.account?.id) {
        toast.success("Bank account added");
        setOpen(false);
        setBankName("");
        setAccountNumber("");
        setTwofaCode("");
        await load();
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 400 && String(err.message || '').toLowerCase().includes('2fa')) {
        setTwofaError('Invalid 2FA code. Please try again.');
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to add bank account");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {empty ? (
        <div className="rounded-lg border p-6 text-center">
          <div className="text-base font-medium">No bank accounts yet</div>
          <div className="text-sm text-muted-foreground mt-1">Add a bank account to receive withdrawals. You can add up to 3 accounts.</div>
          <div className="mt-4">
            <Button onClick={() => setOpen(true)}>Add bank account</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">You can add up to 3 bank accounts.</div>
            <Button onClick={() => setOpen(true)} disabled={!canAddMore}>Add bank account</Button>
          </div>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 px-4">Bank</th>
                  <th className="py-2 px-4">Account number</th>
                  <th className="py-2 px-4">Default</th>
                  <th className="py-2 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : accounts).map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 px-4">{a.bank_name}</td>
                    <td className="py-2 px-4">{a.account_number}</td>
                    <td className="py-2 px-4">{a.is_default ? <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Default</span> : ''}</td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!a.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await withTwofa(async (headers) => {
                                  await apiFetch(`/api/bank-accounts/${a.id}/default`, { method: 'POST', headers });
                                });
                                toast.success('Default account updated');
                                await load();
                              } catch (err) {
                                if (err instanceof Error && err.message.includes('2fa')) return;
                                toast.error(err instanceof Error ? err.message : 'Failed to set default');
                              }
                            }}
                          >
                            Set default
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            try {
                              await withTwofa(async (headers) => {
                                await apiFetch(`/api/bank-accounts/${a.id}`, { method: 'DELETE', headers });
                              });
                              toast.success('Bank account removed');
                              await load();
                            } catch (err) {
                              if (err instanceof Error && err.message.includes('2fa')) return;
                              toast.error(err instanceof Error ? err.message : 'Failed to remove account');
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
                    <td className="py-4 px-4 text-muted-foreground" colSpan={3}>Loading…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTwofaCode(''); setTwofaError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add bank account</DialogTitle>
          </DialogHeader>
          <form onSubmit={onAdd} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bankAccountNumber">Bank account number</Label>
              <Input id="bankAccountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            </div>
            {twofaEnabled && (
              <div className="grid gap-2">
                <Label htmlFor="twofaCode">Two‑factor code</Label>
                <Input
                  id="twofaCode"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  placeholder="123456"
                  value={twofaCode}
                  onChange={(e) => { setTwofaError(''); setTwofaCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6)); }}
                />
                {twofaError && <div className="text-xs text-red-600">{twofaError}</div>}
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting || !canAddMore || (twofaEnabled && !/^\d{6}$/.test(twofaCode))}>{submitting ? 'Adding…' : 'Add account'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {DialogUI}
    </div>
  );
}
