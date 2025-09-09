"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";

type HeadersMap = Record<string, string>;

export function useTwofaPrompt() {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const pending = React.useRef<{
    fn: (headers: HeadersMap) => Promise<void>;
    resolve: () => void;
    reject: (e?: any) => void;
  } | null>(null);

  async function withTwofa<T = void>(fn: (headers: HeadersMap) => Promise<T>): Promise<T> {
    const d = await apiFetch<{ enabled?: boolean }>("/api/users/2fa").catch(() => ({ enabled: false }));
    if (!d?.enabled) {
      // 2FA not enabled; just run
      return (await fn({})) as T;
    }
    setCode("");
    setError("");
    setOpen(true);
    return new Promise<T>((resolve, reject) => {
      pending.current = {
        fn: async (headers) => {
          await fn(headers);
        },
        resolve: () => resolve(undefined as unknown as T),
        reject,
      };
    });
  }

  function onClose() {
    setOpen(false);
    if (pending.current) {
      pending.current.reject(new Error('2fa canceled'));
      pending.current = null;
    }
  }

  async function onConfirm() {
    if (!/^\d{6}$/.test(code) || !pending.current) return;
    setLoading(true);
    setError("");
    try {
      await pending.current.fn({ 'x-2fa-code': code });
      const r = pending.current;
      pending.current = null;
      setOpen(false);
      r.resolve();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 400) {
        const msg = String(e.message || '').toLowerCase();
        if (msg.includes('2fa') || msg.includes('invalid code') || msg.includes('otp')) {
          setError('Invalid 2FA code. Please try again.');
        } else {
          setError(e.message || 'Request failed. Please try again.');
        }
      } else if (e instanceof Error) {
        setError(e.message || 'Request failed. Please try again.');
      } else {
        setError('Request failed. Please try again.');
      }
      // Keep dialog open for retry
    } finally {
      setLoading(false);
    }
  }

  const DialogUI = (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>Two-factor verification</DialogTitle>
          <DialogDescription>Enter the 6-digit code from your authenticator app to continue.</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Input
            inputMode="numeric"
            pattern="\\d*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => { setError(""); setCode(e.target.value.replace(/[^0-9]/g, '').slice(0,6)); }}
            autoFocus
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading || !/^\d{6}$/.test(code)}>{loading ? 'Verifying…' : 'Verify'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { withTwofa, DialogUI } as const;
}
