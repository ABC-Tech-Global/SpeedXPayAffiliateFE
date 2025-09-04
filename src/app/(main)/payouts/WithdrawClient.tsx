"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WithdrawClient({ balance, allow }: { balance: number; allow: boolean }) {
  const [loading, setLoading] = React.useState(false);
  const [current, setCurrent] = React.useState(balance);
  return (
    <div className="flex justify-end">
      <Button
        onClick={async () => {
          setLoading(true);
          try {
            const res = await fetch('/api/me/payouts', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Withdraw failed');
            setCurrent(0);
            toast.success('Withdrawal requested');
            window.location.reload();
          } catch (e: any) {
            toast.error(e?.message || 'Withdraw failed');
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading || current <= 0 || !allow}
      >
        {loading ? 'Processing…' : 'Withdraw commission'}
      </Button>
    </div>
  );
}
