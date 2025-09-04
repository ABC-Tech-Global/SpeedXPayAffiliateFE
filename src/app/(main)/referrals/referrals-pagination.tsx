"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ReferralsPagination({ page, pages, limit, total }: { page: number; pages: number; limit: number; total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  function setParam(k: string, v: string) {
    const url = new URL(window.location.href);
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
    router.push(url.toString());
  }
  function goto(p: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(Math.max(1, Math.min(pages, p))));
    router.push(url.toString());
  }
  const current = page;
  const size = limit;

  const buttons: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(pages, current + 2);
  if (start > 1) buttons.push(1);
  for (let i = start; i <= end; i++) buttons.push(i);
  if (end < pages) buttons.push(pages);

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <div className="text-xs text-muted-foreground">{total} results</div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Rows per page</label>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          defaultValue={String(size)}
          onChange={(e) => {
            const url = new URL(window.location.href);
            url.searchParams.set('limit', e.target.value);
            url.searchParams.set('page', '1');
            router.push(url.toString());
          }}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
        <button className="text-sm disabled:opacity-50" disabled={current <= 1} onClick={() => goto(1)}>First</button>
        <button className="text-sm disabled:opacity-50" disabled={current <= 1} onClick={() => goto(current - 1)}>Prev</button>
        {buttons.map((n, idx) => (
          <button key={idx} className={`text-sm px-2 py-0.5 rounded ${n === current ? 'bg-accent text-accent-foreground' : 'hover:underline'}`} onClick={() => goto(n)} disabled={n === current}>{n}</button>
        ))}
        <button className="text-sm disabled:opacity-50" disabled={current >= pages} onClick={() => goto(current + 1)}>Next</button>
        <button className="text-sm disabled:opacity-50" disabled={current >= pages} onClick={() => goto(pages)}>Last</button>
      </div>
    </div>
  );
}

