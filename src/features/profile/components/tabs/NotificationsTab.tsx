"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { NotificationsUpdateSchema } from "@/lib/schemas";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";

export default function NotificationsTab({ initial }: { initial: { productUpdates: boolean; payouts: boolean } }) {
  const [productUpdates, setProductUpdates] = React.useState(initial.productUpdates);
  const [payouts, setPayouts] = React.useState(initial.payouts);
  const [loading, setLoading] = React.useState(false);

  const { withTwofa, DialogUI } = useTwofaPrompt();
  const isDirty = React.useMemo(() => (
    Boolean(productUpdates) !== Boolean(initial.productUpdates) ||
    Boolean(payouts) !== Boolean(initial.payouts)
  ), [productUpdates, payouts, initial.productUpdates, initial.payouts]);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = NotificationsUpdateSchema.safeParse({ productUpdates, payouts });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Invalid input'); return; }
    setLoading(true);
    try {
      await withTwofa(async (headers) => {
        await apiFetch("/api/users/notifications", { method: "PUT", headers, body: JSON.stringify(parsed.data) });
      });
      toast.success("Notifications updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update notifications");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <input id="productUpdates" type="checkbox" className="size-4" checked={productUpdates} onChange={(e) => setProductUpdates(e.target.checked)} disabled={loading} />
        <Label htmlFor="productUpdates">Product updates</Label>
      </div>
      <div className="flex items-center gap-2">
        <input id="payouts" type="checkbox" className="size-4" checked={payouts} onChange={(e) => setPayouts(e.target.checked)} disabled={loading} />
        <Label htmlFor="payouts">Payout notifications</Label>
      </div>
      <Button type="submit" disabled={loading || !isDirty}>{loading ? "Saving…" : "Save changes"}</Button>
      {DialogUI}
    </form>
  );
}
