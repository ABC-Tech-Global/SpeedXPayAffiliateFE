"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function WithdrawClient({ balance, allow }: { balance: number; allow: boolean }) {
  const [loading, setLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");

  const parsed = Number(amount);
  const isInt = Number.isInteger(parsed);
  const maxWithdraw = Math.floor(balance);
  const invalid = !allow || !Number.isFinite(parsed) || !isInt || parsed <= 0 || parsed > maxWithdraw;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (invalid) return;
    setLoading(true);
    try {
      const res = await fetch('/api/me/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parsed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Withdraw failed');
      toast.success('Withdrawal requested and pending approval');
      setAmount("");
    } catch (e: any) {
      toast.error(e?.message || 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end justify-end gap-3">
      <div className="text-sm text-muted-foreground mr-auto">Available: {formatCurrency(Math.floor(balance))}</div>
      <div className="grid gap-1 w-40">
        <Label htmlFor="withdraw-amount">Amount</Label>
        <Input
          id="withdraw-amount"
          type="number"
          inputMode="numeric"
          step="1"
          min={0}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading || !allow}
          aria-invalid={invalid}
        />
      </div>
      <Button type="submit" disabled={loading || invalid}>
        {loading ? 'Processing…' : 'Withdraw'}
      </Button>
    </form>
  );
}

function formatCurrency(v: number) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v); } catch { return `${Math.round(v)} ₫`; }
}
