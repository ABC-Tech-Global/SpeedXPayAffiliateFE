"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Lock, Copy as CopyIcon, Check as CheckIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ProfileResponse } from "@/types/api";

export default function InviteBar({ kycStatus }: { kycStatus: string | null }) {
  const approved = kycStatus === 'approved';
  const [link, setLink] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      if (!approved) return; // do not fetch username until unlocked
      try {
        const me = await apiFetch<ProfileResponse>('/api/users/profile').catch(() => null);
        const uname = (me?.profile?.username || '').trim();
        if (!uname) return;
        const rawBase = (process.env.NEXT_PUBLIC_REFERRAL_BASE || 'https://member.speedxpay.com').trim();
        const base = rawBase.replace(/\/+$/, '');
        const url = `${base}/${encodeURIComponent(uname)}`;
        setLink(url);
      } catch {}
    })();
  }, [approved]);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const maskedBase = (process.env.NEXT_PUBLIC_REFERRAL_BASE || 'member.speedxpay.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <div className="relative rounded-lg border p-5 md:p-6 flex flex-col gap-4 bg-muted/30">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-foreground font-medium mb-1">Your referral link</div>
          {approved ? (
            <div className="flex items-center gap-3">
              <div className="truncate text-sm md:text-base font-medium" title={link}>{link || '—'}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="rounded-md border bg-muted px-3 py-2 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm md:text-base font-medium select-none">{maskedBase}/••••••••</span>
              </div>
              <div className="text-xs text-muted-foreground">Complete KYC to unlock</div>
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {approved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!link) return;
                navigator.clipboard?.writeText(link).then(() => setCopied(true));
              }}
              disabled={!link}
            >
              {copied ? <>
                <CheckIcon className="h-4 w-4 mr-1" /> Copied
              </> : <>
                <CopyIcon className="h-4 w-4 mr-1" /> Copy link
              </>}
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-black text-white hover:bg-black/90">
              <a href="/kyc">Complete KYC</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
