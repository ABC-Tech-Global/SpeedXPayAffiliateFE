"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function PayoutsFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp.get('type') || '';

  function setParam(k: string, v: string) {
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
    url.searchParams.set('page', '1');
    router.push(url.toString());
  }

  return (
    <div className="flex items-end gap-3 mb-4">
      <div className="grid gap-1">
        <label htmlFor="type" className="text-xs text-muted-foreground">Type</label>
        <select id="type" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={type} onChange={(e) => setParam('type', e.target.value)}>
          <option value="">All</option>
          <option value="referral_order">Referral orders</option>
          <option value="bonus">Bonuses</option>
          <option value="withdrawal">Withdrawals</option>
        </select>
      </div>
    </div>
  );
}

