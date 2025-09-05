"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { WithdrawRequestSchema } from "@/lib/schemas";

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
      // Client-side validation with shared schema
      const check = WithdrawRequestSchema.safeParse({ amount: parsed });
      if (!check.success) {
        toast.error(check.error.issues[0]?.message || 'Invalid amount');
        return;
      }
      await apiFetch('/api/me/payouts', { method: 'POST', body: JSON.stringify(check.data) });
      toast.success('Withdrawal requested and pending approval');
      setAmount("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Withdraw failed';
      toast.error(msg);
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

// uses shared formatCurrency
