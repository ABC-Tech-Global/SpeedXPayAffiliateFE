"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">Please try again. If the problem persists, contact support.</p>
      <button
        type="button"
        className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
        onClick={() => reset()}
      >
        Retry
      </button>
    </div>
  );
}

