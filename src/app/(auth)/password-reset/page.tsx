"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { Check } from "lucide-react";
import { PasswordFields } from "@/features/auth/components/PasswordFields";
import { usePasswordEntry } from "@/features/auth/hooks/usePasswordEntry";

function PasswordResetInner() {
  const {
    password,
    confirm,
    setPassword,
    setConfirm,
    requirements,
    policySatisfied,
    mismatch,
    reset,
  } = usePasswordEntry();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = policySatisfied && !mismatch && !loading && !success;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSuccess(false);
    setLoading(true);
    try {
      await apiFetch("/api/users/force-reset", {
        method: "POST",
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      toast.success("Password updated");
      setSuccess(true);
      reset();
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Set a new password to secure your account.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <PasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            disabled={loading || success}
            mismatch={mismatch}
            requirements={requirements}
          />
          <Button type="submit" disabled={!canSubmit} className="w-full">
            {success ? (
              <span className="inline-flex items-center gap-2">
                <Check className="size-4" /> Password updated
              </span>
            ) : loading ? (
              "Saving…"
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return <PasswordResetInner />;
}
