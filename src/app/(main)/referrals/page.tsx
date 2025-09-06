import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/server-auth";
import { getReferrals } from "@/lib/api/me";
import ReferralsFilters from "@/features/referrals/components/ReferralsFilters";
import InviteBar from "@/features/referrals/components/InviteBar";
import ReferralsPagination from "@/features/referrals/components/ReferralsPagination";
import { formatCurrency } from "@/lib/format";
import { OnboardingBadge, AccountStatusBadge } from "@/components/StatusBadges";

type Referral = { username: string; amount_processed: string; onboarding_status?: string; account_status?: string };

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const spObj = await searchParams;
  const usp = new URLSearchParams();
  if (spObj.q) usp.set('q', String(spObj.q));
  if (spObj.onboarding) usp.set('onboarding', String(spObj.onboarding));
  if (spObj.account) usp.set('account', String(spObj.account));
  const page = Number(spObj.page || 1);
  const limit = Number(spObj.limit || 10);
  usp.set('page', String(page));
  usp.set('limit', String(limit));

  let referrals: Referral[] = [];
  let count = 0;
  let kycStatus: string | null = null;
  try {
    const [referralsData, kycData] = await Promise.all([
      getReferrals({
        q: usp.get('q') || undefined,
        onboarding: usp.get('onboarding') || undefined,
        account: usp.get('account') || undefined,
        page,
        limit,
      }),
      getKyc(),
    ]);
    referrals = Array.isArray(referralsData?.referrals) ? (referralsData.referrals as Referral[]) : [];
    count = Number(referralsData?.total || 0);
    kycStatus = kycData?.kyc?.status || null;
  } catch {}

  const totalAmount = referrals.reduce((sum, r) => sum + Number(r.amount_processed || 0), 0);
  const pages = Math.max(1, Math.ceil((count || 0) / limit));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <InviteBar kycStatus={kycStatus} />
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
