"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import QRCode from "@/components/QRCode";
import { apiFetch } from "@/lib/api-client";
import { TwoFAEnableSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TwofaDialogButton() {
  const [open, setOpen] = React.useState(false);
  const [otpauth, setOtpauth] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function init() {
    try {
      const d = await apiFetch<{ otpauth?: string }>(`/api/users/2fa/init`, { method: 'POST' });
      setOtpauth(d?.otpauth || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to initialize 2FA');
    }
  }

  async function onVerify() {
    const parsed = TwoFAEnableSchema.safeParse({ code });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Invalid code'); return; }
    setLoading(true);
    try {
      await apiFetch(`/api/users/2fa/enable`, { method: 'POST', body: JSON.stringify(parsed.data) });
      toast.success('2FA enabled');
      setOpen(false);
      setCode('');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setOpen(true); init(); }}>Set up</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable two-factor authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Scan the QR in your authenticator app, then enter the 6-digit code.</div>
            {otpauth && <QRCode value={otpauth} size={160} className="h-40 w-40" alt="2FA setup QR" />}
            <div className="flex items-center gap-2">
              <Input id="twofa-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
              <Button size="sm" onClick={onVerify} disabled={loading || code.trim().length !== 6}>{loading ? 'Verifying…' : 'Verify & enable'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

