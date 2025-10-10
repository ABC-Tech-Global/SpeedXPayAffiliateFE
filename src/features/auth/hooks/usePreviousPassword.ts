import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "password-reset:previous-password";

/**
 * Store the user's current password just long enough to compare it inside the
 * forced reset flow. We only keep it in session storage so it is cleared when
 * the tab closes and never leaves the browser.
 */
export function rememberPreviousPasswordForReset(password: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, password);
  } catch {
    // Swallow storage errors (e.g., Safari private mode)
  }
}

export function clearRememberedPasswordForReset() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing we can do if storage is unavailable
  }
}

/**
 * Reads and clears the previously stored password so the reset screen can
 * prevent users from reusing it.
 */
export function usePreviousPasswordOnReset(currentPassword: string) {
  const [previousPassword, setPreviousPassword] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreviousPassword(stored);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage access issues (e.g., disabled storage)
    }
  }, []);

  const isSameAsPrevious = useMemo(
    () => Boolean(previousPassword) && currentPassword === previousPassword,
    [previousPassword, currentPassword],
  );

  return { previousPassword, isSameAsPrevious };
}
