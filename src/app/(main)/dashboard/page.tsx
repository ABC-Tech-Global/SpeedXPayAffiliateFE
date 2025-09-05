import { requireUser } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnnouncementsCarousel } from "@/components/AnnouncementsCarousel";
import Link from "next/link";
import { getKyc, getProfile, getPayouts, getReferralsAccountBreakdown } from "@/lib/api/me";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();

  let balance = 0;
  let history: import('@/types/api').HistoryItem[] = [];
  let totalReferrals = 0;
  let activeCount = 0;
  let onboardingCount = 0;
  let deactivatedCount = 0;
  let kycStatus: string | null = null;
  let payoutReady = false;
  let twofaEnabled = false;
  let showOnboarding = true;

  try {
    const [pd, breakdown, kyc, prof] = await Promise.all([
      getPayouts({ limit: 5, page: 1 }),
      getReferralsAccountBreakdown(),
      getKyc(),
      getProfile(),
    ]);
    balance = Number(pd?.balance || 0);
    history = Array.isArray(pd?.history) ? pd.history.slice(0, 5) : ([] as import('@/types/api').HistoryItem[]);
    totalReferrals = breakdown.total;
    activeCount = breakdown.active;
    onboardingCount = breakdown.onboarding;
    deactivatedCount = breakdown.deactivated;
    kycStatus = kyc?.kyc?.status || null;
    const payment = prof?.payment || {};
    twofaEnabled = Boolean(prof?.profile?.twofaEnabled);
    payoutReady = Boolean(payment?.bankName) && Boolean(payment?.bankAccountNumber);
  } catch {}

  // Hide onboarding card when required steps are done (KYC + payout details + 2FA)
  if (kycStatus === 'approved' && payoutReady && twofaEnabled) {
    showOnboarding = false;
  }

  const totalBreakdown = [
    { label: 'Onboarding', value: onboardingCount },
    { label: 'Active', value: activeCount },
    { label: 'Deactivated', value: deactivatedCount },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Welcome back, {user.username}</h1>
        <div className="text-xs text-muted-foreground">{new Date().toLocaleString()}</div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available commission</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-semibold">{formatCurrency(balance)}</div>
            <Link href="/payouts" className="text-sm underline underline-offset-4">Payouts</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalReferrals}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {totalBreakdown.map((b) => (
                <span key={b.label} className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-xs">
                  {b.label}: {b.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Announcements banner */}
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementsCarousel
            items={[
              "New milestone bonuses launching next month.",
              "Leaderboard season kicks off soon — prepare to compete!",
              "Platform improvements for faster payout processing.",
            ]}
            intervalMs={6000}
          />
        </CardContent>
      </Card>

      {showOnboarding && (
        <OnboardingCard kycStatus={kycStatus} payoutReady={payoutReady} twofaEnabled={twofaEnabled} />
      )}

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
    </div>
  );
}

function OnboardingCard({ kycStatus, payoutReady, twofaEnabled }: { kycStatus: string | null, payoutReady: boolean, twofaEnabled: boolean }) {
  const kycDone = kycStatus === 'approved';
  const kycPending = kycStatus === 'pending';
  const payoutDone = payoutReady;
  const twofaDone = Boolean(twofaEnabled);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">Complete KYC</div>
              <div className="text-xs text-muted-foreground">Required to invite referrals</div>
            </div>
            {kycDone ? (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Done</span>
            ) : kycPending ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">Pending review</span>
            ) : (
              <Link href="/kyc"><Button size="sm">{kycStatus === 'rejected' ? 'Review & resubmit' : 'Start KYC'}</Button></Link>
            )}
          </li>
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">Add payout bank details</div>
              <div className="text-xs text-muted-foreground">Required to submit payout requests</div>
            </div>
            {payoutDone ? (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Done</span>
            ) : (
              <Link href="/profile#payment"><Button size="sm" variant="outline">Add details</Button></Link>
            )}
          </li>
          <li className="flex items-center justify-between">
            <div>
              <div className="font-medium">Secure account with 2FA</div>
              <div className="text-xs text-muted-foreground">Optional</div>
            </div>
            {twofaDone ? (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Done</span>
            ) : (
              <Link href="/profile#security"><Button size="sm" variant="outline">Set up</Button></Link>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
