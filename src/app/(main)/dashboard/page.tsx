import { requireUser } from "@/lib/server-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementsCarousel } from "@/components/AnnouncementsCarousel";
import Link from "next/link";
import { getPayouts } from "@/lib/api/payouts";
import { getReferralsAccountBreakdown } from "@/lib/api/referrals";
import { formatCurrency } from "@/lib/format";
import OnboardingCard from "./OnboardingCard";
import { Suspense } from "react";
import RecentActivity from "./RecentActivity";
export default async function DashboardPage() {
  const user = await requireUser();

  let balance = 0;
  let totalReferrals = 0;
  let activeCount = 0;
  let onboardingCount = 0;
  let deactivatedCount = 0;
  // OnboardingCard decides visibility dynamically per request

  try {
    const [pd, breakdown] = await Promise.all([
      getPayouts({ limit: 5, page: 1 }),
      getReferralsAccountBreakdown(),
    ]);
    balance = Number(pd?.balance || 0);
    totalReferrals = breakdown.total;
    activeCount = breakdown.active;
    onboardingCount = breakdown.onboarding;
    deactivatedCount = breakdown.deactivated;
  } catch {}

  const totalBreakdown = [
    { label: 'Onboarding', value: onboardingCount },
    { label: 'Active', value: activeCount },
    { label: 'Deactivated', value: deactivatedCount },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Welcome back, {user.username}</h1>
      </div>

      <Suspense fallback={
        <Card className="bg-muted/50">
          <CardHeader><CardTitle>Onboarding progress</CardTitle></CardHeader>
          <CardContent><div className="h-20" /></CardContent>
        </Card>
      }>
        <OnboardingCard />
      </Suspense>

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

      <Suspense fallback={
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-24" />
          </CardContent>
        </Card>
      }>
        <RecentActivity />
      </Suspense>
    </div>
  );
}

// Dynamic OnboardingCard moved to ./OnboardingCard and streamed via Suspense
