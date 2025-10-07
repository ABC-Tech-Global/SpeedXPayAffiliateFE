"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy as CopyIcon, Check as CheckIcon } from "lucide-react";

type Props = {
  referralLink: string;
  showUsernameHint?: boolean;
};

export default function InviteBar({ referralLink, showUsernameHint = false }: Props) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const link = referralLink.trim();
  const hasLink = link.length > 0;
  const maskedBase = (process.env.NEXT_PUBLIC_REFERRAL_BASE || 'member.speedxpay.com')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  return (
    <div className="relative rounded-lg border p-5 md:p-6 flex flex-col gap-4 bg-muted/30">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-foreground font-medium mb-1">Your referral link</div>
          <div className="flex flex-col gap-1.5">
            <div className="rounded-md border bg-muted px-3 py-2 flex items-center gap-2">
              <span className="truncate text-sm md:text-base font-medium" title={hasLink ? link : undefined}>
                {hasLink ? link : `${maskedBase}/your-handle`}
              </span>
            </div>
            {showUsernameHint && (
              <div className="text-xs text-muted-foreground">Set your username in profile to personalize your link.</div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!hasLink) return;
              navigator.clipboard?.writeText(link).then(() => setCopied(true));
            }}
            disabled={!hasLink}
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 mr-1" /> Copied
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4 mr-1" /> Copy link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
