"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddBankDialogButton from "@/features/onboarding/components/AddBankDialogButton";
import type { OnboardingOverview } from "@/types/api";

const STORAGE_KEY = "onboardingJustCompleted";

type OnboardingCardProps = {
  overview?: OnboardingOverview | null;
};

type DisplayState = "cta" | "success" | "hidden";

export default function OnboardingCard({ overview }: OnboardingCardProps) {
  const requiresSetup = overview
    ? overview.requireSetup || overview.payoutBankCount < 1
    : true;

  const initialState: DisplayState = requiresSetup ? "cta" : "hidden";
  const [displayState, setDisplayState] = React.useState<DisplayState>(initialState);

  React.useEffect(() => {
    if (requiresSetup) {
      setDisplayState("cta");
      return;
    }

    if (typeof window === "undefined") {
      setDisplayState("hidden");
      return;
    }

    const justCompleted = window.sessionStorage.getItem(STORAGE_KEY);
    if (justCompleted === "1") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      setDisplayState("success");
      return;
    }

    setDisplayState("hidden");
  }, [requiresSetup]);

  if (displayState === "hidden") return null;

  if (displayState === "success") {
    return (
      <Card className="border-emerald-200 bg-emerald-50 text-emerald-900">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
            <div>
              <div className="text-sm font-medium">All set!</div>
              <p className="text-xs text-emerald-700">Your payout bank details are ready. You can request withdrawals anytime.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
            onClick={() => setDisplayState("hidden")}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

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
