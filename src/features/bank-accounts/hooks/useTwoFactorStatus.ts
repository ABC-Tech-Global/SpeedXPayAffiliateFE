"use client";

import * as React from "react";

import { apiFetch } from "@/lib/api-client";

export function useTwoFactorStatus(enabled: boolean) {
  const [twofaEnabled, setTwofaEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;

    let alive = true;

    (async () => {
      try {
        const response = await apiFetch<{ enabled?: boolean }>("/api/users/2fa");
        if (!alive) return;
        setTwofaEnabled(Boolean(response?.enabled));
      } catch {
        if (!alive) return;
        setTwofaEnabled(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);

  return twofaEnabled;
}
