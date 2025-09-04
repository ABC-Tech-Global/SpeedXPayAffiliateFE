"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function InviteBar() {
  const [status, setStatus] = useState<string | null>(null);
  const [link, setLink] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const kd = await fetch('/api/me/kyc', { cache: 'no-store' }).then(r => r.json());
        const approved = kd?.kyc?.status === 'approved';
        setStatus(kd?.kyc?.status || null);
        const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        // Simple referral link based on username (backend can later issue codes)
        const me = await fetch('/api/me/profile', { cache: 'no-store' }).then(r => r.json()).catch(() => null);
        const uname = me?.profile?.username;
        if (approved && site && uname) {
          setLink(`${site}/signup?ref=${encodeURIComponent(uname)}`);
        }
      } catch {}
    })();
  }, []);

  if (status !== 'approved') {
    return (
      <div className="rounded-md border p-3 flex items-center justify-between">
        <div className="text-sm">KYC must be approved before inviting referrals.</div>
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

