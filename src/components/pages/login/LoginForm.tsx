"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { LoginSchema } from "@/lib/schemas";
import { Check } from "lucide-react";
import {
  clearRememberedPasswordForReset,
  rememberPreviousPasswordForReset,
} from "@/features/auth/hooks/usePreviousPassword";
import { writeTourSeenCache } from "@/features/onboarding/utils/tourSeen";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate client-side before submitting
      const parsed = LoginSchema.safeParse({ username, password });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message || "Invalid input";
        setError(msg);
        toast.error(msg);
        return;
      }
      const data = await apiFetch<{ ok: boolean; passwordResetRequired?: boolean; isTourSeen?: boolean }>(`/api/login`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      if (typeof data?.isTourSeen === "boolean") {
        writeTourSeenCache(data.isTourSeen);
      }
      setSuccess(true);
      // Give users brief visual feedback before redirecting
      const toReset = Boolean(data?.passwordResetRequired);
      if (toReset) {
        // Keep the password momentarily so the reset screen can block reuse
        rememberPreviousPasswordForReset(password);
      } else {
        clearRememberedPasswordForReset();
      }

      setTimeout(() => {
        if (toReset) {
          const u = new URL('/password-reset', window.location.origin);
          window.location.href = u.toString();
        } else {
          window.location.href = "/dashboard";
        }
      }, 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Log in failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    username.trim().length > 0 && password.length >= 8 && !loading && !success;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username" className="mb-1">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="jane.doe"
          required
          disabled={loading || success}
        />
      </div>

      <div>
        <Label htmlFor="password" className="mb-1">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
          disabled={loading || success}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {success ? (
          <span className="inline-flex items-center gap-2">
            <Check className="size-4" /> Logged in
          </span>
        ) : loading ? (
          "Logging in…"
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}
