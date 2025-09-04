"use client";

import * as React from "react";

export default function ReferralTabsShell({ username, overview, transactions }: { username: string; overview: React.ReactNode; transactions: React.ReactNode }) {
  const [tab, setTab] = React.useState<'overview'|'transactions'>('overview');
  React.useEffect(() => {
    const read = () => {
      let h = (typeof window !== 'undefined' ? window.location.hash : '') as string;
      if (h.startsWith('#/')) h = h.slice(2);
      else if (h.startsWith('#')) h = h.slice(1);
      if (h === 'overview' || h === 'transactions') setTab(h);
      else setTab('overview');
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <div className="flex gap-2">
          <a className={`px-3 py-2 text-sm rounded-md ${tab==='overview'?'bg-accent text-accent-foreground':'hover:bg-accent/60'}`} href={`#overview`}>Overview</a>
          <a className={`px-3 py-2 text-sm rounded-md ${tab==='transactions'?'bg-accent text-accent-foreground':'hover:bg-accent/60'}`} href={`#transactions`}>Transactions</a>
        </div>
      </div>
      <div className={tab==='overview' ? '' : 'hidden'} aria-hidden={tab!=='overview'}>
        {overview}
      </div>
      <div className={tab==='transactions' ? '' : 'hidden'} aria-hidden={tab!=='transactions'}>
        {transactions}
      </div>
    </div>
  );
}
