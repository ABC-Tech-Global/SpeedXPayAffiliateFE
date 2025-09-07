"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { ChangePasswordSchema, TwoFAEnableSchema } from "@/lib/schemas";
import QRCode from "@/components/QRCode";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";

function SecurityForm() {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const canSubmit = newPassword.length >= 6 && newPassword === confirm;

  const { withTwofa, DialogUI } = useTwofaPrompt();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error("Passwords do not match"); return; }
    const parsed = ChangePasswordSchema.safeParse({ newPassword });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Invalid input'); return; }
    setLoading(true);
    try {
      await withTwofa(async (headers) => {
        await apiFetch("/api/users/change-password", { method: "POST", headers, body: JSON.stringify(parsed.data) });
      });
      toast.success("Password changed");
      setNewPassword("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} required minLength={6} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} required minLength={6} />
      </div>
      <Button type="submit" disabled={loading || !canSubmit}>{loading ? "Saving…" : "Change password"}</Button>
      {DialogUI}
    </form>
  );
}

function TwoFASetup() {
  const [step, setStep] = React.useState<'idle'|'init'|'verify'|'enabled'>('idle');
  const [otpauth, setOtpauth] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [details, setDetails] = React.useState<{ enabled: boolean; issuer?: string; label?: string; digits?: number; period?: number } | null>(null);
  const { withTwofa, DialogUI } = useTwofaPrompt();

  React.useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch<{ enabled?: boolean; issuer?: string; label?: string; digits?: number; period?: number }>("/api/users/2fa");
        setDetails(d || null);
        if (d?.enabled) setStep('enabled');
      } catch {}
    })();
  }, []);

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="font-medium">Two-factor authentication (2FA)</div>
      {step === 'idle' && (
        <Button size="sm" variant="outline" onClick={async () => {
          setStep('init');
          const data = await apiFetch<{ otpauth?: string }>(
            '/api/users/2fa/init',
            { method: 'POST' }
          );
          setOtpauth(data?.otpauth ?? null);
          setStep('verify');
        }}>Enable 2FA</Button>
      )}
      {step === 'verify' && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Scan the QR in your authenticator app, then enter the 6-digit code.</div>
          {otpauth && <QRCode value={otpauth} size={160} className="h-40 w-40" alt="2FA setup QR" />}
          <div className="flex items-center gap-2">
            <Input id="twofa-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
            <Button size="sm" onClick={async () => {
              try {
                const parsed = TwoFAEnableSchema.safeParse({ code });
                if (!parsed.success) { alert(parsed.error.issues[0]?.message || 'Invalid code'); return; }
                await apiFetch('/api/users/2fa/enable', { method: 'POST', body: JSON.stringify(parsed.data) });
                setStep('enabled');
                const d = await apiFetch<{ enabled?: boolean; issuer?: string; label?: string; digits?: number; period?: number }>("/api/users/2fa");
                setDetails(d || { enabled: true });
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Invalid code');
              }
            }}>Verify & enable</Button>
          </div>
        </div>
      )}
      {step === 'enabled' && (
        <div className="space-y-2">
          <div className="text-sm text-green-700">2FA is enabled.</div>
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div>Type: Time-based (TOTP)</div>
            <div>Digits: {details?.digits ?? 6}</div>
            <div>Interval: {details?.period ?? 30}s</div>
            {details?.issuer && <div>Issuer: {details.issuer}</div>}
            {details?.label && <div>Account label: {details.label}</div>}
          </div>
          <div className="text-xs text-muted-foreground">To move 2FA to a new device, disable it and enable again to get a new QR code.</div>
          <div>
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                await withTwofa(async (headers) => {
                  await apiFetch('/api/users/2fa/disable', { method: 'POST', headers, body: JSON.stringify({}) });
                });
                setDetails({ enabled: false });
                setStep('idle');
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Failed to disable 2FA');
              }
            }}>Disable 2FA</Button>
          </div>
          {DialogUI}
        </div>
      )}
    </div>
  );
}

export default function SecurityTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Security</h2>
      <SecurityForm />
      <TwoFASetup />
    </div>
  );
}
