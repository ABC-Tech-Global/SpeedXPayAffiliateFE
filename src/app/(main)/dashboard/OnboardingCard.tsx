import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getKyc } from "@/lib/api/kyc";
import { getProfile } from "@/lib/api/users";

export default async function OnboardingCard() {
  let kycStatus: string | null = null;
  let payoutReady = false;
  let twofaEnabled = false;
  try {
    const [kyc, prof] = await Promise.all([getKyc(), getProfile()]);
    kycStatus = kyc?.kyc?.status || null;
    const payment = prof?.payment || {};
    twofaEnabled = Boolean(prof?.profile?.twofaEnabled);
    payoutReady = Boolean(payment?.bankName) && Boolean(payment?.bankAccountNumber);
  } catch {}

  // If all onboarding steps are done, render nothing
  if (kycStatus === 'approved' && payoutReady && twofaEnabled) return null;

  const kycDone = kycStatus === 'approved';
  const kycPending = kycStatus === 'pending';
  const payoutDone = payoutReady;
  const twofaDone = twofaEnabled;

  return (
    <Card className="bg-muted/50">
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
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Approved</span>
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
