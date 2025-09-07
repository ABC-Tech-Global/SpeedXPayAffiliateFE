import { requireUser } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/api/users";
import { getPayouts } from "@/lib/api/payouts";
import { getWithdrawals } from "@/lib/api/withdrawals";
import WithdrawClient from "@/features/payouts/components/WithdrawClient";
import PayoutsFilters from "@/features/payouts/components/PayoutsFilters";
import PayoutsPagination from "@/features/payouts/components/PayoutsPagination";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusPill as StatusBadge } from "@/components/StatusBadges";

type Tx = { type: string; amount: string; description: string; created_at: string };
type Withdrawal = { id: number; amount: number | string; status: string; reviewer_note?: string | null; created_at?: string };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const spObj = await searchParams;
  const usp = new URLSearchParams();
  const type = String(spObj.type || '');
  if (type) usp.set('type', type);
  const page = Number(spObj.page || 1);
  const limit = Number(spObj.limit || 10);
  usp.set('page', String(page));
  usp.set('limit', String(limit));

  let balance = 0;
  let history: Tx[] = [];
  let total = 0;
  let allowWithdraw = false;
  let withdrawals: Withdrawal[] = [];
  try {
    const [payouts, prof, wres] = await Promise.all([
      getPayouts({ page, limit, type: type || undefined }),
      getProfile(),
      getWithdrawals({ page: 1, limit: 10 }),
    ]);
    balance = Number(payouts?.balance || 0);
    history = Array.isArray(payouts?.history) ? payouts.history as unknown as Tx[] : [];
    total = Number(payouts?.total || 0);
    const payout = prof?.payment || {};
    allowWithdraw = Boolean(payout?.bankName) && Boolean(payout?.bankAccountNumber);
    withdrawals = Array.isArray(wres?.withdrawals) ? (wres.withdrawals as Withdrawal[]) : [];
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
