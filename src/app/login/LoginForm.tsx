"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Check } from "lucide-react";

type Props = { nextHref: string }

export default function LoginForm({ nextHref }: Props) {
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
      const data = await apiFetch<{ ok: boolean; passwordResetRequired?: boolean }>(`/api/login`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setSuccess(true);
      // Give users brief visual feedback before redirecting
      setTimeout(() => {
        const toReset = Boolean(data?.passwordResetRequired);
        if (toReset) {
          const u = new URL('/password-reset', window.location.origin);
          u.searchParams.set('next', nextHref);
          window.location.href = u.toString();
        } else {
          window.location.href = nextHref;
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
    username.trim().length > 0 && password.length >= 6 && !loading && !success;

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
          minLength={6}
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
