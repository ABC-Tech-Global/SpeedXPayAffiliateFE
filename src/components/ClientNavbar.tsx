"use client";

import dynamic from "next/dynamic";
const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });

export default function ClientNavbar({ user }: { user?: { username: string } | null }) {
  return <Navbar user={user} />;
}

