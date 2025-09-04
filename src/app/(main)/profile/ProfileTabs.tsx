"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Initial = {
  profile: { username?: string; fullName?: string; email?: string; phone?: string };
  payment: { payoutMethod?: string; payoutEmail?: string };
  notifications: { productUpdates?: boolean; payouts?: boolean };
};

export default function ProfileTabs({ initial }: { initial: Initial }) {
  const pathname = usePathname();
  const [tab, setTab] = React.useState<"profile" | "payment" | "security" | "notifications" | "kyc">("profile");

  // Initialize from hash and listen for changes
  React.useEffect(() => {
    const readHash = () => {
      const h = (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '') as any;
      if (h === 'profile' || h === 'payment' || h === 'security' || h === 'notifications' || h === 'kyc') {
        setTab(h);
      } else {
        // Force a canonical default hash without adding history entries
        if (typeof window !== 'undefined') {
          history.replaceState(null, '', `${pathname}#profile`);
        }
        setTab('profile');
      }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  function goto(t: string) {
    // Update hash without full navigation
    if (typeof window !== 'undefined') {
      const next = `${pathname}#${t}`;
      history.replaceState(null, '', next);
      // Manually update state since hashchange may not fire with replaceState
      setTab(t as any);
    }
  }

  const tabClass = (t: string) =>
    [
      "px-3 py-2 text-sm rounded-md",
      t === tab ? "bg-accent text-accent-foreground" : "hover:bg-accent/60 text-muted-foreground",
    ].join(" ");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button type="button" className={tabClass("profile")} onClick={() => goto("profile")}>
          Profile
        </button>
        <button type="button" className={tabClass("kyc")} onClick={() => goto("kyc")}>
          KYC
        </button>
        <button type="button" className={tabClass("payment")} onClick={() => goto("payment")}>
          Payment
        </button>
        <button type="button" className={tabClass("security")} onClick={() => goto("security")}>
          Security
        </button>
        <button type="button" className={tabClass("notifications")} onClick={() => goto("notifications")}>
          Notifications
        </button>
      </div>

      <section className={tab === "profile" ? "space-y-4" : "space-y-4 hidden"} aria-hidden={tab !== "profile"}>
        <h2 className="text-lg font-medium">Profile information</h2>
        <ProfileForm initial={{
          username: initial.profile?.username || "",
          fullName: initial.profile?.fullName || "",
          email: initial.profile?.email || "",
          phone: initial.profile?.phone || "",
        }} />
      </section>

      <section className={tab === "payment" ? "space-y-4" : "space-y-4 hidden"} aria-hidden={tab !== "payment"}>
        <h2 className="text-lg font-medium">Payment information</h2>
        <PaymentForm initial={{
          payoutMethod: initial.payment?.payoutMethod || "paypal",
          payoutEmail: initial.payment?.payoutEmail || "",
        }} />
      </section>

      <section className={tab === "security" ? "space-y-4" : "space-y-4 hidden"} aria-hidden={tab !== "security"}>
        <h2 className="text-lg font-medium">Security</h2>
        <SecurityForm />
      </section>

      <section className={tab === "notifications" ? "space-y-4" : "space-y-4 hidden"} aria-hidden={tab !== "notifications"}>
        <h2 className="text-lg font-medium">Notifications</h2>
        <NotificationsForm initial={{
          productUpdates: initial.notifications?.productUpdates ?? true,
          payouts: initial.notifications?.payouts ?? true,
        }} />
      </section>

      <section className={tab === "kyc" ? "space-y-4" : "space-y-4 hidden"} aria-hidden={tab !== "kyc"}>
        <h2 className="text-lg font-medium">KYC</h2>
        <KycEntry />
      </section>
    </div>
  );
}

function ProfileForm({ initial }: { initial: { username: string; fullName: string; email: string; phone: string } }) {
  const [fullName, setFullName] = React.useState(initial.fullName);
  const [username, setUsername] = React.useState(initial.username);
  const [email, setEmail] = React.useState(initial.email);
  const [phone, setPhone] = React.useState(initial.phone);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Basic E.164 phone validation if provided
    if (phone && !/^\+?[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Invalid phone format. Use e.g. +15551234567");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, fullName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save profile");
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
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          pattern="^\\+?[1-9]\\d{6,14}$"
          title="Enter a valid phone number (e.g., +15551234567)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          placeholder="e.g., +15551234567"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function KycEntry() {
  const router = useRouter();
  const [status, setStatus] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me/kyc', { cache: 'no-store' });
        const data = await res.json();
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
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground"
            onClick={goToKyc}
          >
            Start KYC
          </button>
        </>
      )}

      {status === 'draft' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium">In progress</span></p>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border"
            onClick={goToKyc}
          >
            Continue KYC
          </button>
        </>
      )}

      {status === 'pending' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium">Submitted — Pending review</span></p>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border"
            onClick={goToKyc}
          >
            View submission
          </button>
        </>
      )}

      {status === 'approved' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium text-green-600">Approved</span></p>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border"
            onClick={goToKyc}
          >
            View details
          </button>
        </>
      )}

      {status === 'rejected' && (
        <>
          <p className="text-sm">KYC status: <span className="font-medium text-red-600">Rejected</span></p>
          {reason && <p className="text-xs text-muted-foreground">Reason: {reason}</p>}
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground"
            onClick={goToKyc}
          >
            Review and resubmit
          </button>
        </>
      )}
    </div>
  )
}

function PaymentForm({ initial }: { initial: { payoutMethod: string; payoutEmail: string } }) {
  const [payoutMethod, setPayoutMethod] = React.useState(initial.payoutMethod);
  const [payoutEmail, setPayoutEmail] = React.useState(initial.payoutEmail);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/me/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutMethod, payoutEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save payment info");
      toast.success("Payment info updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment info");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="payoutMethod">Payout method</Label>
        <select
          id="payoutMethod"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={payoutMethod}
          onChange={(e) => setPayoutMethod(e.target.value)}
          disabled={loading}
        >
          <option value="paypal">PayPal</option>
          <option value="bank">Bank transfer (email only)</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="payoutEmail">Payout email</Label>
        <Input id="payoutEmail" type="email" value={payoutEmail} onChange={(e) => setPayoutEmail(e.target.value)} disabled={loading} required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function SecurityForm() {
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to change password");
      toast.success("Password changed");
      setOldPassword("");
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
        <Label htmlFor="oldPassword">Current password</Label>
        <Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} disabled={loading} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} required minLength={6} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={loading} required minLength={6} />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}

function NotificationsForm({ initial }: { initial: { productUpdates: boolean; payouts: boolean } }) {
  const [productUpdates, setProductUpdates] = React.useState(initial.productUpdates);
  const [payouts, setPayouts] = React.useState(initial.payouts);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/me/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUpdates, payouts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update notifications");
      toast.success("Notifications updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update notifications");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <input id="productUpdates" type="checkbox" className="size-4" checked={productUpdates} onChange={(e) => setProductUpdates(e.target.checked)} disabled={loading} />
        <Label htmlFor="productUpdates">Product updates</Label>
      </div>
      <div className="flex items-center gap-2">
        <input id="payouts" type="checkbox" className="size-4" checked={payouts} onChange={(e) => setPayouts(e.target.checked)} disabled={loading} />
        <Label htmlFor="payouts">Payout notifications</Label>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
