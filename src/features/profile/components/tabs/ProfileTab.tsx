"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { ProfileUpdateSchema } from "@/lib/schemas";
import { useTwofaPrompt } from "@/features/profile/hooks/useTwofaPrompt";

export default function ProfileTab({ initial }: { initial: { username: string; email: string; phone: string } }) {
  const [username, setUsername] = React.useState(initial.username);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  function normalizePhone(input: string) {
    const trimmed = input.trim();
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/[^0-9]/g, '');
    return (hasPlus ? '+' : '') + digits;
  }

  const { withTwofa, DialogUI } = useTwofaPrompt();
  const initialNormalizedPhone = React.useMemo(() => (initial.phone ? normalizePhone(initial.phone) : ''), []);
  const isDirty = React.useMemo(() => {
    const currentNormPhone = phone ? normalizePhone(phone) : '';
    return (
      username.trim() !== (initial.username || '').trim() ||
      email.trim() !== (initial.email || '').trim() ||
      currentNormPhone !== initialNormalizedPhone
    );
  }, [username, email, phone, initialNormalizedPhone, initial.username, initial.email]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = phone ? normalizePhone(phone) : '';
    const parsed = ProfileUpdateSchema.safeParse({ username, email, phone: normalized });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Invalid input'); return; }
    setLoading(true);
    try {
      await withTwofa(async (headers) => {
        await apiFetch("/api/users/profile", { method: "PUT", headers, body: JSON.stringify(parsed.data) });
      });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} minLength={3} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhone((v) => normalizePhone(v))} disabled={loading} placeholder="e.g., +1 555-123-4567" />
      </div>
      <Button type="submit" disabled={loading || !isDirty}>{loading ? "Saving…" : "Save changes"}</Button>
      {DialogUI}
    </form>
  );
}
