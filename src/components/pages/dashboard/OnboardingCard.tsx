import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/api/users";
import { getBankAccounts } from "@/lib/api/bank-accounts";
import AddBankDialogButton from "@/features/onboarding/components/AddBankDialogButton";
import TwofaDialogButton from "@/features/onboarding/components/TwofaDialogButton";

export default async function OnboardingCard() {
  let payoutReady = false;
  let twofaEnabled = false;
  try {
    const [profile, bankData] = await Promise.all([getProfile(), getBankAccounts()]);
    const accounts = Array.isArray(bankData.accounts) ? bankData.accounts : [];
    twofaEnabled = Boolean(profile?.profile?.twofaEnabled);
    payoutReady = accounts.length > 0;
  } catch {}

  // If all onboarding steps are done, render nothing
  if (payoutReady && twofaEnabled) return null;

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
              <div className="font-medium">Add payout bank details</div>
              <div className="text-xs text-muted-foreground">Required to submit payout requests</div>
            </div>
            {payoutDone ? (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Done</span>
            ) : (
              <AddBankDialogButton />
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
              <TwofaDialogButton />
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
