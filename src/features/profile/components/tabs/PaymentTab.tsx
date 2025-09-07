"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { PaymentUpdateSchema } from "@/lib/schemas";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";

export default function PaymentTab({ initial }: { initial: { bankName: string; bankAccountNumber: string } }) {
  const [bankName, setBankName] = React.useState(initial.bankName);
  const [bankAccountNumber, setBankAccountNumber] = React.useState(initial.bankAccountNumber);
  const [loading, setLoading] = React.useState(false);

  const { withTwofa, DialogUI } = useTwofaPrompt();
  const isDirty = React.useMemo(() => (
    (bankName || '').trim() !== (initial.bankName || '').trim() ||
    (bankAccountNumber || '').trim() !== (initial.bankAccountNumber || '').trim()
  ), [bankName, bankAccountNumber, initial.bankName, initial.bankAccountNumber]);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = PaymentUpdateSchema.safeParse({ bankName, bankAccountNumber });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Invalid input'); return; }
    setLoading(true);
    try {
      await withTwofa(async (headers) => {
        await apiFetch("/api/users/payment", { method: "PUT", headers, body: JSON.stringify(parsed.data) });
      });
      toast.success("Payment info updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment info");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="bankName">Bank name</Label>
        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={loading} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankAccountNumber">Bank account number</Label>
        <Input id="bankAccountNumber" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} disabled={loading} required />
      </div>
      <Button type="submit" disabled={loading || !isDirty}>{loading ? "Saving…" : "Save changes"}</Button>
      {DialogUI}
    </form>
  );
}
