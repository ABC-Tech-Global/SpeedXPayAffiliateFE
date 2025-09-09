"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import ProfileTab from "./tabs/ProfileTab";
import BankAccountsTab from "./tabs/BankAccountsTab";
import SecurityTab from "./tabs/SecurityTab";
import NotificationsTab from "./tabs/NotificationsTab";
import KycTab from "./tabs/KycTab";

type Initial = {
  profile: { username?: string; email?: string; phone?: string };
  payment: { bankName?: string; bankAccountNumber?: string };
  notifications: { productUpdates?: boolean; payouts?: boolean };
};

type Tab = "profile" | "payment" | "security" | "notifications" | "kyc";

export default function ProfileTabs({ initial }: { initial: Initial }) {
  const pathname = usePathname();
  const [tab, setTab] = React.useState<Tab>("profile");

  React.useEffect(() => {
    const readHash = () => {
      const hStr = (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '');
      const valid = ['profile','payment','security','notifications','kyc'] as const;
      if ((valid as readonly string[]).includes(hStr)) setTab(hStr as Tab);
      else {
        if (typeof window !== 'undefined') history.replaceState(null, '', `${pathname}#profile`);
        setTab('profile');
      }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [pathname]);

  function goto(t: Tab) {
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `${pathname}#${t}`);
      setTab(t);
    }
  }

  const tabClass = (t: string) => [
    "px-3 py-2 text-sm rounded-md",
    t === tab ? "bg-accent text-accent-foreground" : "hover:bg-accent/60 text-muted-foreground",
  ].join(" ");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button type="button" className={tabClass("profile")} onClick={() => goto("profile")}>Profile</button>
        <button type="button" className={tabClass("kyc")} onClick={() => goto("kyc")}>KYC</button>
        <button type="button" className={tabClass("payment")} onClick={() => goto("payment")}>Payment</button>
        <button type="button" className={tabClass("security")} onClick={() => goto("security")}>Security</button>
        <button type="button" className={tabClass("notifications")} onClick={() => goto("notifications")}>Notifications</button>
      </div>

      <section className={clsx("space-y-4", tab !== "profile" && "hidden")} aria-hidden={tab !== "profile"}>
        <h2 className="text-lg font-medium">Profile information</h2>
        <ProfileTab initial={{
          username: initial.profile?.username || "",
          email: initial.profile?.email || "",
          phone: initial.profile?.phone || "",
        }} />
      </section>

      <section className={clsx("space-y-4", tab !== "payment" && "hidden")} aria-hidden={tab !== "payment"}>
        <h2 className="text-lg font-medium">Payment information</h2>
        <BankAccountsTab />
      </section>

      <section className={clsx("space-y-4", tab !== "security" && "hidden")} aria-hidden={tab !== "security"}>
        <SecurityTab />
      </section>

      <section className={clsx("space-y-4", tab !== "notifications" && "hidden")} aria-hidden={tab !== "notifications"}>
        <h2 className="text-lg font-medium">Notifications</h2>
        <NotificationsTab initial={{
          productUpdates: initial.notifications?.productUpdates ?? true,
          payouts: initial.notifications?.payouts ?? true,
        }} />
      </section>

      <section className={clsx("space-y-4", tab !== "kyc" && "hidden")} aria-hidden={tab !== "kyc"}>
        <h2 className="text-lg font-medium">KYC</h2>
        <KycTab />
      </section>
    </div>
  );
}
