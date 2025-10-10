"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api-client";
import type { AffiliateBankOption } from "../types";
import { normalizeAffiliateBankOptions } from "../utils";

type State = {
  options: AffiliateBankOption[];
  loading: boolean;
  error: string;
};

export function useAffiliateBankOptions(enabled: boolean) {
  const [state, setState] = React.useState<State>({ options: [], loading: false, error: "" });

  React.useEffect(() => {
    if (!enabled) return;

    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: "" }));

    (async () => {
      try {
        const response = await apiFetch<unknown>("/api/BankAccount/getaffbanklist");
        if (!alive) return;
        const options = normalizeAffiliateBankOptions(response);
        setState({ options, loading: false, error: options.length ? "" : "No banks available right now." });
      } catch {
        if (!alive) return;
        setState({ options: [], loading: false, error: "Unable to load bank list. Please try again." });
      }
    })();

    return () => {
      alive = false;
    };
  }, [enabled]);

  return state;
}
