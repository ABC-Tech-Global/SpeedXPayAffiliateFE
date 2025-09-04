"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackLink({ className, to }: { className?: string; to?: string }) {
  const router = useRouter();

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      if (to) {
        router.push(to);
        return;
      }
      const state = (typeof window !== 'undefined' ? (window.history.state as unknown as { idx?: number } | null) : null);
      const idx = Number(state?.idx ?? 0);
      if (idx > 0) router.back();
      else router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  }

  return (
    <a
      href="#"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline ${className || ''}`.trim()}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back</span>
    </a>
  );
}
