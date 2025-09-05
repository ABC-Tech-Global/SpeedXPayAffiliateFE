"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { ProfileResponse } from "@/types/api";

type Step = {
  title: string;
  body: React.ReactNode;
};

export default function WelcomeTour() {
  const [open, setOpen] = React.useState(false);
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      try {
        const prof = await apiFetch<ProfileResponse>('/api/me/profile');
        const seen = Boolean(prof?.profile?.welcomeTourSeen);
        if (seen) return; // server-side flag controls visibility across devices
      } catch {}
      const s: Step[] = [];
      // Step 1: Welcome and value props
      s.push({
        title: 'Welcome to SpeedXPay Affiliate Portal',
        body: <p className="text-sm text-muted-foreground">Welcome to your affiliate hub.</p>,
      });
      // Step 2: Earn on Every Transaction
      s.push({
        title: 'Earn on Every Transaction',
        body: <p className="text-sm text-muted-foreground">Share your unique link and earn a commission whenever someone you refer completes a transaction.</p>,
      });
      // Step 3: Unlock Special Rewards
      s.push({
        title: 'Unlock Special Rewards',
        body: <p className="text-sm text-muted-foreground">Hit your monthly goals and all-time targets to unlock special bonuses.</p>,
      });
      // Step 4: Compete and Win
      s.push({
        title: 'Compete and Win',
        body: <p className="text-sm text-muted-foreground">Climb the leaderboards and compete with top affiliates for even greater rewards.</p>,
      });

      setSteps(s);
      setOpen(true);
    })();
  }, []);

  if (!open || steps.length === 0) return null;
  const step = steps[i];

  async function done() {
    try { await apiFetch('/api/me/tour/seen', { method: 'POST' }); } catch {}
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="relative min-h-screen flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl text-center space-y-6">
          <Illustration index={i} />
          <div className="text-xs text-muted-foreground">Step {i + 1} of {steps.length}</div>
          <h1 className="text-2xl sm:text-3xl font-semibold">{step.title}</h1>
          <div className="mx-auto max-w-2xl text-sm text-muted-foreground">
            {step.body}
          </div>
          <div className="flex items-center justify-center gap-1 pt-2">
            {steps.map((_, idx) => (
              <span key={idx} className={`h-2 w-2 rounded-full ${idx === i ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            {i > 0 && <Button variant="outline" onClick={() => setI((v) => Math.max(0, v - 1))}>Back</Button>}
            {i < steps.length - 1 ? (
              <Button onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}>Next</Button>
            ) : (
              <Button onClick={done}>Finish</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Illustration({ index }: { index: number }) {
  // Minimal inline illustrations per step (placeholders)
  const colors = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444'];
  const color = colors[index % colors.length];
  return (
    <svg width="200" height="120" viewBox="0 0 200 120" className="mx-auto">
      <rect x="10" y="20" width="180" height="80" rx="12" fill={`${color}22`} stroke={color} />
      <circle cx="50" cy="60" r="18" fill={color} opacity="0.8" />
      <rect x="80" y="45" width="90" height="12" rx="6" fill={color} opacity="0.6" />
      <rect x="80" y="65" width="60" height="10" rx="5" fill={color} opacity="0.4" />
    </svg>
  );
}
