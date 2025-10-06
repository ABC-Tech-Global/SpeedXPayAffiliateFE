"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

export default function ReferralsFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = sp.get('q') || '';
  const onboarding = sp.get('onboarding') || '';
  const account = sp.get('account') || '';

  function setParam(k: string, v: string) {
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
    url.searchParams.set('page', '1'); // reset page on filter change
    router.push(url.toString() as Route);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="grid gap-1">
        <label htmlFor="q" className="text-xs text-muted-foreground">Search</label>
        <input id="q" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={q} placeholder="Username" onBlur={(e) => setParam('q', e.target.value)} />
      </div>
      <div className="grid gap-1">
        <label htmlFor="onboarding" className="text-xs text-muted-foreground">Onboarding</label>
        <select id="onboarding" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={onboarding} onChange={(e) => setParam('onboarding', e.target.value)}>
          <option value="">All</option>
          <option value="Registered">Registered</option>
          <option value="Bank Account added">Bank Account added</option>
          <option value="Pledge added">Pledge added</option>
        </select>
      </div>
      <div className="grid gap-1">
        <label htmlFor="account" className="text-xs text-muted-foreground">Account</label>
        <select id="account" className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={account} onChange={(e) => setParam('account', e.target.value)}>
          <option value="">All</option>
          <option value="onboarding">Onboarding</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>
    </div>
  );
}
