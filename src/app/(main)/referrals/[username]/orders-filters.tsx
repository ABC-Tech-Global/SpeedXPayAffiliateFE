"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function OrdersFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';

  function setParam(k: string, v: string) {
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
    url.searchParams.set('page', '1');
    router.push(url.toString());
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-2">
      <div className="grid gap-1">
        <label htmlFor="from" className="text-xs text-muted-foreground">From</label>
        <input id="from" type="date" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={from} onChange={(e) => setParam('from', e.target.value)} />
      </div>
      <div className="grid gap-1">
        <label htmlFor="to" className="text-xs text-muted-foreground">To</label>
        <input id="to" type="date" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={to} onChange={(e) => setParam('to', e.target.value)} />
      </div>
    </div>
  );
}

