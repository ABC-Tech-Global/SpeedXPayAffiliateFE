"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { WithdrawRequestSchema } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";

type Payment = { bankName?: string; bankAccountNumber?: string };
type BankAccount = { id: number; bank_name: string; account_number: string; is_default: boolean };

export default function WithdrawClient({ balance, allow, payment }: { balance: number; allow: boolean; payment?: Payment }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [canWithdraw, setCanWithdraw] = React.useState(allow);
  const [accounts, setAccounts] = React.useState<BankAccount[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [accLoading, setAccLoading] = React.useState(false);
  const [newBankName, setNewBankName] = React.useState("");
  const [newAccountNumber, setNewAccountNumber] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [twofaEnabled, setTwofaEnabled] = React.useState(false);
  const [twofaCode, setTwofaCode] = React.useState("");
  const [twofaError, setTwofaError] = React.useState("");

  const parsed = Number(amount);
  const isInt = Number.isInteger(parsed);
  const maxWithdraw = Math.floor(balance);
  const invalid = !canWithdraw || !Number.isFinite(parsed) || !isInt || parsed <= 0 || parsed > maxWithdraw || !selected;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (invalid) return;
    setLoading(true);
    try {
      const check = WithdrawRequestSchema.safeParse({ amount: parsed, bankAccountId: Number(selected) });
      if (!check.success) {
        toast.error(check.error.issues[0]?.message || 'Invalid amount');
        return;
      }
      await apiFetch('/api/payouts/withdraw', { method: 'POST', body: JSON.stringify(check.data) });
      toast.success('Withdrawal requested and pending approval');
      setAmount("");
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Withdraw failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    setAccLoading(true);
    apiFetch<{ accounts?: BankAccount[] }>(`/api/bank-accounts`).then((res) => {
      const list = Array.isArray(res?.accounts) ? res.accounts : [];
      setAccounts(list);
      const def = list.find(a => a.is_default) || list[0];
      setSelected(def ? String(def.id) : "");
    }).catch(() => setAccounts([])).finally(() => setAccLoading(false));
  }

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const d = await apiFetch<{ enabled?: boolean }>(`/api/users/2fa`).catch(() => ({ enabled: false } as any));
        setTwofaEnabled(Boolean(d?.enabled));
      } catch { setTwofaEnabled(false); }
    })();
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-end">
        <Button type="button" onClick={openDialog} disabled={loading}>
          Withdraw
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTwofaCode(''); setTwofaError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canWithdraw ? 'Request withdrawal' : 'Add payout bank information'}</DialogTitle>
          </DialogHeader>
          {canWithdraw ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-1 w-full">
                <Label htmlFor="withdraw-amount">Amount</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  aria-invalid={invalid}
                />
                <div className="text-xs text-muted-foreground">Available commission: {formatCurrency(Math.floor(balance))}</div>
              </div>

              <div className="grid gap-1">
                <Label>Bank account</Label>
                <Select value={selected} onValueChange={setSelected} disabled={accLoading || accounts.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={accLoading ? 'Loading…' : (accounts.length ? 'Select an account' : 'No accounts') } />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.bank_name} — {a.account_number}{a.is_default ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accounts.length === 0 && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="ba-name">Bank name</Label>
                      <Input id="ba-name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Your bank" />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="ba-number">Account number</Label>
                      <Input id="ba-number" value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} placeholder="0000000000" />
                    </div>
                    {twofaEnabled && (
                      <div className="sm:col-span-2 grid gap-1">
                        <Label htmlFor="ba-twofa">Two‑factor code</Label>
                        <Input
                          id="ba-twofa"
                          inputMode="numeric"
                          pattern="\\d*"
                          maxLength={6}
                          placeholder="123456"
                          value={twofaCode}
                          onChange={(e) => { setTwofaError(''); setTwofaCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6)); }}
                        />
                        {twofaError && <div className="text-xs text-red-600">{twofaError}</div>}
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Button type="button" variant="outline" disabled={adding || !newBankName.trim() || !newAccountNumber.trim() || (twofaEnabled && !/^\d{6}$/.test(twofaCode))} onClick={async () => {
                        try {
                          setAdding(true);
                          const headers = twofaEnabled && twofaCode ? { 'x-2fa-code': twofaCode } : {};
                          const created = await apiFetch<{ account?: BankAccount }>(`/api/bank-accounts`, { method: 'POST', headers, body: JSON.stringify({ bankName: newBankName.trim(), bankAccountNumber: newAccountNumber.trim(), makeDefault: true }) });
                          if (created?.account?.id) {
                            // refresh list
                            const listRes = await apiFetch<{ accounts?: BankAccount[] }>(`/api/bank-accounts`);
                            const list = Array.isArray(listRes?.accounts) ? listRes.accounts : [];
                            setAccounts(list);
                            setSelected(String(created.account.id));
                            setNewBankName(""); setNewAccountNumber(""); setTwofaCode("");
                            toast.success('Bank account added');
                          }
                        } catch (err: any) {
                          if (err instanceof ApiError && err.status === 400 && String(err.message || '').toLowerCase().includes('2fa')) {
                            setTwofaError('Invalid 2FA code. Please try again.');
                          } else {
                            toast.error(err instanceof Error ? err.message : 'Failed to add account');
                          }
                        } finally {
                          setAdding(false);
                        }
                      }}>
                        {adding ? 'Adding…' : 'Add bank account'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={loading || invalid}>
                  {loading ? 'Processing…' : 'Submit request'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-1">
                <Label htmlFor="ba-name">Bank name</Label>
                <Input id="ba-name" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Your bank" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="ba-number">Account number</Label>
                <Input id="ba-number" value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} placeholder="0000000000" />
              </div>
              {twofaEnabled && (
                <div className="grid gap-1">
                  <Label htmlFor="ba-twofa2">Two‑factor code</Label>
                  <Input
                    id="ba-twofa2"
                    inputMode="numeric"
                    pattern="\\d*"
                    maxLength={6}
                    placeholder="123456"
                    value={twofaCode}
                    onChange={(e) => { setTwofaError(''); setTwofaCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6)); }}
                  />
                  {twofaError && <div className="text-xs text-red-600">{twofaError}</div>}
                </div>
              )}
              <DialogFooter>
                <Button type="button" disabled={adding || !newBankName.trim() || !newAccountNumber.trim() || (twofaEnabled && !/^\d{6}$/.test(twofaCode))} onClick={async () => {
                  try {
                    setAdding(true);
                    const headers = twofaEnabled && twofaCode ? { 'x-2fa-code': twofaCode } : {};
                    const res = await apiFetch<{ account?: BankAccount }>(`/api/bank-accounts`, { method: 'POST', headers, body: JSON.stringify({ bankName: newBankName.trim(), bankAccountNumber: newAccountNumber.trim(), makeDefault: true }) });
                    if (res?.account?.id) {
                      setCanWithdraw(true);
                      toast.success('Bank account added');
                      // prepare selection list
                      const listRes = await apiFetch<{ accounts?: BankAccount[] }>(`/api/bank-accounts`);
                      const list = Array.isArray(listRes?.accounts) ? listRes.accounts : [];
                      setAccounts(list);
                      setSelected(String(res.account.id));
                      setNewBankName(""); setNewAccountNumber(""); setTwofaCode("");
                    }
                  } catch (err: any) {
                    if (err instanceof ApiError && err.status === 400 && String(err.message || '').toLowerCase().includes('2fa')) {
                      setTwofaError('Invalid 2FA code. Please try again.');
                    } else {
                      toast.error(err instanceof Error ? err.message : 'Failed to add account');
                    }
                  } finally {
                    setAdding(false);
                  }
                }}>
                  {adding ? 'Adding…' : 'Add bank account'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// uses shared formatCurrency
