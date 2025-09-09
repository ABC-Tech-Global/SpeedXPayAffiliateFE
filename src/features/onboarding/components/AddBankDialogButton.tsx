"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function AddBankDialogButton() {
  const [open, setOpen] = React.useState(false);
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [twofaEnabled, setTwofaEnabled] = React.useState(false);
  const [twofaCode, setTwofaCode] = React.useState("");
  const [twofaError, setTwofaError] = React.useState("");
  const router = useRouter();

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

  async function onAdd() {
    const name = bankName.trim();
    const number = accountNumber.trim();
    if (!name || !number) return;
    if (twofaEnabled && !/^\d{6}$/.test(twofaCode)) {
      setTwofaError('Enter a valid 6‑digit code');
      return;
    }
    setLoading(true);
    try {
      setTwofaError("");
      const headers = twofaEnabled && twofaCode ? { 'x-2fa-code': twofaCode } : {};
      await apiFetch('/api/bank-accounts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bankName: name, bankAccountNumber: number, makeDefault: true })
      });
      toast.success('Bank details saved');
      setOpen(false);
      setBankName('');
      setAccountNumber('');
      setTwofaCode('');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const msg = String(e.message || '').toLowerCase();
        if (msg.includes('2fa')) setTwofaError('Invalid 2FA code. Please try again.');
        else toast.error('Invalid request. Please check inputs.');
      } else {
        toast.error(e instanceof Error ? e.message : 'Failed to add bank details');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Add details</Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTwofaCode(''); setTwofaError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payout bank details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
          </div>
          <DialogFooter>
            <Button onClick={onAdd} disabled={loading || !bankName.trim() || !accountNumber.trim() || (twofaEnabled && !/^\d{6}$/.test(twofaCode))}>{loading ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
