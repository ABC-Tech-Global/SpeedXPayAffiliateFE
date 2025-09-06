"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { ProfileResponse } from "@/types/api";

export default function InviteBar({ kycStatus }: { kycStatus: string | null }) {
  const [link, setLink] = React.useState<string>("");
  React.useEffect(() => {
    (async () => {
      try {
        const approved = kycStatus === 'approved';
        const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        // Simple referral link based on username (backend can later issue codes)
        const me = await apiFetch<ProfileResponse>('/api/me/profile').catch(() => null);
        const uname = me?.profile?.username;
        if (approved && site && uname) {
          setLink(`${site}/signup?ref=${encodeURIComponent(uname)}`);
        }
      } catch {}
    })();
  }, [kycStatus]);

  if (kycStatus !== 'approved') {
    return (
      <div className="rounded-md border p-3 flex items-center justify-between bg-muted/50">
        <div className="text-l">KYC must be approved before inviting referrals.</div>
        <a href="/kyc" className="text-sm underline underline-offset-4">Go to KYC</a>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 flex items-center justify-between gap-3">
      <div className="text-sm overflow-hidden">
        <div className="text-xs text-muted-foreground">Your referral link</div>
        <div className="truncate">{link}</div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard?.writeText(link).then(() => {
            alert('Copied!');
          });
        }}
        disabled={!link}
      >
        Copy link
      </Button>
    </div>
  );
}