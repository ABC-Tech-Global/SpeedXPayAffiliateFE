"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Announcement = string | ReactNode;

export function AnnouncementsCarousel({
  items,
  intervalMs = 3000,
  className,
}: {
  items: Announcement[];
  intervalMs?: number;
  className?: string;
}) {
  const slides = useMemo(() => items.filter(Boolean), [items]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
          aria-live="polite"
        >
          {slides.map((content, i) => (
            <div key={i} className="min-w-full px-0 py-1">
              <div className="text-sm text-muted-foreground">
                {typeof content === "string" ? <p>{content}</p> : content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-muted",
                i === index && "bg-foreground"
              )}
              aria-label={`Slide ${i + 1}${i === index ? ", current" : ""}`}
            />)
          )}
        </div>
      )}
    </div>
  );
}
