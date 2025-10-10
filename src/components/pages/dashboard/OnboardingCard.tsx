import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBankAccounts } from "@/lib/api/bank-accounts";
import AddBankDialogButton from "@/features/onboarding/components/AddBankDialogButton";

export default async function OnboardingCard() {
  let payoutReady = false;
  try {
    const bankData = await getBankAccounts();
    const accounts = Array.isArray(bankData.accounts) ? bankData.accounts : [];
    payoutReady = accounts.length > 0;
  } catch {}

  // If onboarding is complete, render nothing
  if (payoutReady) return null;

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle>Onboarding progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Complete onboarding by adding payout bank details so you can request withdrawals.
        </p>
        <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/40 p-3">
          <div>
            <div className="font-medium">Add payout bank details</div>
            <div className="text-xs text-muted-foreground">Required to submit payout requests</div>
          </div>
          <AddBankDialogButton />
        </div>
      </CardContent>
    </Card>
  );
}
