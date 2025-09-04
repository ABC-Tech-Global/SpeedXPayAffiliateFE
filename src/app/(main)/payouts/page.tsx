import { requireUser } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { headers, cookies } from "next/headers";
import WithdrawClient from "./WithdrawClient";
import PayoutsFilters from "./payouts-filters";
import PayoutsPagination from "./payouts-pagination";

type Tx = { type: string; amount: string; description: string; created_at: string };
type Withdrawal = { id: number; amount: number | string; status: string; reviewer_note?: string | null; created_at?: string };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const h = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";
  const spObj = await searchParams;
  const usp = new URLSearchParams();
  const type = String(spObj.type || '');
  if (type) usp.set('type', type);
  const page = Number(spObj.page || 1);
  const limit = Number(spObj.limit || 10);
  usp.set('page', String(page));
  usp.set('limit', String(limit));
  const url = `${proto}://${host}/api/me/payouts?${usp.toString()}`;
  const profileUrl = `${proto}://${host}/api/me/profile`;

  let balance = 0;
  let history: Tx[] = [];
  let total = 0;
  let allowWithdraw = false;
  let withdrawals: Withdrawal[] = [];
  try {
    const [res, prof, wres] = await Promise.all([
      fetch(url, { cache: 'no-store', headers: { Cookie: cookieHeader } }),
      fetch(profileUrl, { cache: 'no-store', headers: { Cookie: cookieHeader } }),
      fetch(`${proto}://${host}/api/me/withdrawals?limit=10&page=1`, { cache: 'no-store', headers: { Cookie: cookieHeader } })
    ]);
    const data = await res.json();
    balance = Number(data?.balance || 0);
    history = Array.isArray(data?.history) ? data.history : [];
    total = Number(data?.total || 0);
    const profData = await prof.json().catch(() => ({}));
    const payout = profData?.payment || {};
    allowWithdraw = Boolean(payout?.bankName) && Boolean(payout?.bankAccountNumber);
    const wd = await wres.json().catch(() => ({}));
    withdrawals = Array.isArray(wd?.withdrawals) ? wd.withdrawals : [];
  } catch {}

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Available commission</div>
              <div className="text-2xl font-semibold">{formatCurrency(balance)}</div>
            </div>
          </div>
          <WithdrawClient balance={balance} allow={allowWithdraw} />
          {!allowWithdraw && (
            <div className="mt-2 text-xs text-red-600">Add payout bank details in Profile → Payment to request payouts.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal requests</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{formatDate(String(w.created_at || ''))}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={String(w.status)} />
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(Number(w.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutsFilters />
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4">{formatDate(tx.created_at)}</td>
                      <td className="py-2 pr-4 capitalize">{tx.type.replace('_',' ')}</td>
                      <td className="py-2 pr-4">{tx.description}</td>
                      <td className={"py-2 pr-4 text-right " + (Number(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(Number(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PayoutsPagination page={page} pages={Math.max(1, Math.ceil(total / limit))} limit={limit} total={total} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCurrency(v: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${Math.round(v)} ₫`;
  }
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const norm = status.toLowerCase();
  const label = norm === 'approved' ? 'Approved' : norm === 'rejected' ? 'Rejected' : 'Pending';
  const cls = norm === 'approved'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : norm === 'rejected'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
