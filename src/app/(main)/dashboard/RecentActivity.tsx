import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getPayouts } from "@/lib/api/payouts";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function RecentActivity() {
  let history: import('@/types/api').HistoryItem[] = [];
  try {
    const pd = await getPayouts({ limit: 5, page: 1 });
    history = Array.isArray(pd?.history) ? pd.history.slice(0, 5) : ([] as import('@/types/api').HistoryItem[]);
  } catch {}

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
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
          </div>
        )}
        <div className="mt-3 text-right text-sm"><Link className="underline underline-offset-4" href="/payouts">View all</Link></div>
      </CardContent>
    </Card>
  );
}
