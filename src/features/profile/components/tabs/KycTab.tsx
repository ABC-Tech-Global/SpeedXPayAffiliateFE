"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { apiFetch } from "@/lib/api-client";
import type { KycResponse } from "@/types/api";

export default function KycTab() {
  const router = useRouter();
  const [status, setStatus] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<KycResponse>('/api/kyc');
        const kyc = data?.kyc;
        if (kyc) {
          setStatus(kyc.status || null);
          setReason(kyc.rejection_reason || null);
        } else {
          setStatus(null);
        }
      } catch {
        setStatus(null);
      }
    })();
  }, []);

  const goToKyc = () => router.push('/kyc' as Route);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {!status && (
        <>
          <p className="text-sm text-muted-foreground">You have not started KYC verification.</p>
          <button type="button" className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground" onClick={goToKyc}>
            Start KYC
          </button>
        </>
      )}

      {status === 'draft' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium">In progress</span></p>
          <button type="button" className="inline-flex items-center px-3 py-2 text-sm rounded-md border" onClick={goToKyc}>
            Continue KYC
          </button>
        </>
      )}

      {status === 'pending' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium">Submitted — Pending review</span></p>
          <button type="button" className="inline-flex items-center px-3 py-2 text-sm rounded-md border" onClick={goToKyc}>
            View submission
          </button>
        </>
      )}

      {status === 'approved' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium text-green-600">Approved</span></p>
          <button type="button" className="inline-flex items-center px-3 py-2 text-sm rounded-md border" onClick={goToKyc}>
            View details
          </button>
        </>
      )}

      {status === 'rejected' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium text-red-600">Rejected</span></p>
          {reason && <p className="text-xs text-muted-foreground">Reason: {reason}</p>}
          <button type="button" className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground" onClick={goToKyc}>
            Review and resubmit
          </button>
        </>
      )}
    </div>
  );
}
