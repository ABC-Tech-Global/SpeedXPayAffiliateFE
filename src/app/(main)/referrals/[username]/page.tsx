import { requireUser } from "@/lib/server-auth";
import { headers, cookies } from "next/headers";
import OnboardingBadge from "../OnboardingBadge";
import ReferralTabsShell from "../ReferralTabsShell";
import OrdersFilters from "./orders-filters";

type Order = { id?: string; amount?: number | string; created_at?: string };

export default async function ReferralDetailPage({ params, searchParams }: { params: { username: string }, searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const spObj = await searchParams;
  const page = Number(spObj.page || 1);
  const limit = Number(spObj.limit || 10);

  const h = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";

  const usp = new URLSearchParams();
  usp.set('page', String(page));
  usp.set('limit', String(limit));

  const detailUrl = `${proto}://${host}/api/me/referrals/${encodeURIComponent(params.username)}`;
  const ordersUrl = `${proto}://${host}/api/me/referrals/${encodeURIComponent(params.username)}/orders?${usp.toString()}`;

  let orders: Order[] = [];
  let total = 0;
  let detail: any = null;
  try {
    const dres = await fetch(detailUrl, { cache: 'no-store', headers: { Cookie: cookieHeader } });
    detail = await dres.json();
    const res = await fetch(ordersUrl, { cache: 'no-store', headers: { Cookie: cookieHeader } });
    const data = await res.json();
    orders = Array.isArray(data?.orders) ? data.orders : [];
    total = Number(data?.total || 0);
  } catch {}

  const overview = (
    <>
      {detail?.referral && (
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Onboarding</div>
            <div className="mt-1"><OnboardingBadge status={detail.referral.onboarding_status} /></div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Account</div>
            <div className="mt-1 capitalize">{detail.referral.account_status}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Processed</div>
            <div className="mt-1 font-medium">{formatCurrency(Number(detail.referral.amount_processed || 0))}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="mt-1 font-medium">{Number(detail.referral.orders_count || 0)}</div>
          </div>
        </section>
      )}
    </>
  );

  const transactions = (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Transactions</h2>
      <OrdersFilters />
      <div className="overflow-x-auto">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Order ID</th>
                <th className="py-2 pr-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4">{formatDate(String(o.created_at || ''))}</td>
                  <td className="py-2 pr-4">{o.id || '-'}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(Number(o.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ReferralPagination page={page} pages={Math.max(1, Math.ceil(total / limit))} />
    </section>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Referral: {params.username}</h1>
      </header>
      <ReferralTabsShell username={params.username} overview={overview} transactions={transactions} />
    </div>
  );
}

function formatCurrency(v: number) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(v); } catch { return `$${v.toFixed(2)}`; }
}
function formatDate(iso: string) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }

function Tabs({ username }: { username: string }) {
  return (
    <div className="border-b border-border mb-4">
      <div className="flex gap-2">
        <a className="px-3 py-2 text-sm rounded-md hover:bg-accent/60" href={`#/overview`}>Overview</a>
        <a className="px-3 py-2 text-sm rounded-md bg-accent text-accent-foreground" href={`#/transactions`}>Transactions</a>
      </div>
    </div>
  );
}

function ReferralPagination({ page, pages }: { page: number; pages: number }) {
  const prevHref = typeof window === 'undefined' ? '#' : (() => { const url = new URL(window.location.href); url.searchParams.set('page', String(Math.max(1, page-1))); return url.toString(); })();
  const nextHref = typeof window === 'undefined' ? '#' : (() => { const url = new URL(window.location.href); url.searchParams.set('page', String(Math.min(pages, page+1))); return url.toString(); })();
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <a className={`text-sm underline-offset-4 ${page<=1?'pointer-events-none opacity-50':'hover:underline'}`} href={prevHref}>Previous</a>
      <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
      <a className={`text-sm underline-offset-4 ${page>=pages?'pointer-events-none opacity-50':'hover:underline'}`} href={nextHref}>Next</a>
    </div>
  );
}
