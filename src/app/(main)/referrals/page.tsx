import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/server-auth";
import { headers, cookies } from "next/headers";
import ReferralsFilters from "./referrals-filters";
import InviteBar from "./invite-bar";
import ReferralsPagination from "./referrals-pagination";

type Referral = { username: string; amount_processed: string; onboarding_status?: string; account_status?: string };

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const spObj = await searchParams;
  const h = await headers();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("host") || "localhost:3000";
  const usp = new URLSearchParams();
  if (spObj.q) usp.set('q', String(spObj.q));
  if (spObj.onboarding) usp.set('onboarding', String(spObj.onboarding));
  if (spObj.account) usp.set('account', String(spObj.account));
  const page = Number(spObj.page || 1);
  const limit = Number(spObj.limit || 10);
  usp.set('page', String(page));
  usp.set('limit', String(limit));
  const url = `${proto}://${host}/api/me/referrals?${usp.toString()}`;

  let referrals: Referral[] = [];
  let count = 0;
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Cookie: cookieHeader } });
    const data = await res.json();
    referrals = Array.isArray(data?.referrals) ? data.referrals : [];
    count = Number(data?.total || 0);
  } catch {}

  const totalAmount = referrals.reduce((sum, r) => sum + Number(r.amount_processed || 0), 0);
  const pages = Math.max(1, Math.ceil((count || 0) / limit));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <InviteBar />
      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralsFilters />
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">Onboarding Status</th>
                    <th className="py-2 pr-4">Account Status</th>
                    <th className="py-2 pr-4 text-right">Amount Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <a className="hover:underline" href={`/referrals/${encodeURIComponent(r.username)}`}>{r.username}</a>
                      </td>
                      <td className="py-2 pr-4"><OnboardingBadge status={r.onboarding_status || 'Registered'} /></td>
                      <td className="py-2 pr-4"><AccountStatusBadge status={r.account_status || 'active'} /></td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(Number(r.amount_processed || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="py-2 pr-4 font-medium" colSpan={3}>Total</td>
                    <td className="py-2 pr-4 text-right font-medium">{formatCurrency(totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
              <ReferralsPagination page={page} pages={pages} limit={limit} total={count} />
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

// pagination moved to client component

function OnboardingBadge({ status }: { status: string }) {
  const label = status;
  const norm = status.toLowerCase();
  const cls = norm.includes('approved') || norm.includes('completed')
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : norm.includes('bank') || norm.includes('pledge')
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function AccountStatusBadge({ status }: { status: string }) {
  const norm = status.toLowerCase();
  const label = norm === 'onboarding' ? 'Onboarding' : norm === 'deactivated' ? 'Deactivated' : 'Active';
  const cls = norm === 'active'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : norm === 'deactivated'
      ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
