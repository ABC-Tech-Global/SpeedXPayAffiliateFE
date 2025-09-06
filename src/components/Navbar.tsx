"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import clsx from "clsx";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api-client";
import type { KycResponse, ProfileResponse } from "@/types/api";

type Props = { user?: { username: string } | null };

export default function Navbar({ user }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [payoutReady, setPayoutReady] = useState<boolean>(false);

  // Close the mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch onboarding statuses for CTA
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch<KycResponse>('/api/me/kyc');
        if (!alive) return;
        setKycStatus(data?.kyc?.status || null);
        const prof = await apiFetch<ProfileResponse>('/api/me/profile').catch(() => ({} as ProfileResponse));
        const pay = prof?.payment || {};
        setPayoutReady(Boolean(pay?.bankName) && Boolean(pay?.bankAccountNumber));
      } catch {}
    })();
    return () => { alive = false };
  }, []);

  // Sheet handles focus trap; we only ensure close on route change.

  if (pathname?.startsWith("/login")) return null;

  

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="relative z-50 mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden -ml-2"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 max-w-[80vw]">
              <SheetHeader className="sr-only">
                <SheetTitle>Mobile navigation</SheetTitle>
              </SheetHeader>
              <nav className="px-4 py-4 flex flex-col gap-2 text-sm h-full" aria-label="Primary">
                <Link
                  href="/"
                  className={clsx(
                    "py-1",
                    pathname === "/" && "text-foreground font-medium underline"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/referrals"
                  className={clsx(
                    "py-1",
                    pathname?.startsWith("/referrals") && "text-foreground font-medium underline"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Referrals
                </Link>
                <Link
                  href="/payouts"
                  className={clsx(
                    "py-1",
                    pathname?.startsWith("/payouts") && "text-foreground font-medium underline"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  Payouts
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="text-sm font-semibold">
            App
          </Link>
          <nav className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
            <Link
              href="/"
              className={clsx(
                "hover:underline",
                pathname === "/" && "text-foreground font-medium underline"
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/referrals"
              className={clsx(
                "hover:underline",
                pathname?.startsWith("/referrals") && "text-foreground font-medium underline"
              )}
            >
              Referrals
            </Link>
            <Link
              href="/payouts"
              className={clsx(
                "hover:underline",
                pathname?.startsWith("/payouts") && "text-foreground font-medium underline"
              )}
            >
              Payouts
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Removed 'Complete KYC' CTA per request */}
          {kycStatus === 'approved' && !payoutReady && (
            <Link href="/profile#payment" className="hidden md:inline-flex">
              <Button variant="outline" size="sm">Add payout details</Button>
            </Link>
          )}
          <UserMenu user={user} />
        </div>
      </div>
      {/* Mobile nav handled by Sheet */}
    </header>
  );
}
