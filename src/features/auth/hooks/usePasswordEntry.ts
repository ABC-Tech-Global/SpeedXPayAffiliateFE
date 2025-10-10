import { useCallback, useMemo, useState } from "react";
import {
  evaluatePasswordPolicy,
  type PasswordRequirementResult,
} from "@/lib/password-policy";

export type PasswordEntryState = {
  password: string;
  confirm: string;
  setPassword: (value: string) => void;
  setConfirm: (value: string) => void;
  requirements: PasswordRequirementResult[];
  policySatisfied: boolean;
  mismatch: boolean;
  reset: () => void;
};

export function usePasswordEntry(initialPassword = "", initialConfirm = ""): PasswordEntryState {
  const [password, setPasswordState] = useState(initialPassword);
  const [confirm, setConfirmState] = useState(initialConfirm);

  const requirements = useMemo(
    () => evaluatePasswordPolicy(password),
    [password],
  );

  const policySatisfied = useMemo(
    () => requirements.every((item) => item.met),
    [requirements],
  );

  const mismatch = useMemo(
    () => Boolean(password) && Boolean(confirm) && password !== confirm,
    [password, confirm],
  );

  const reset = useCallback(() => {
    setPasswordState("");
    setConfirmState("");
  }, []);

  return {
    password,
    confirm,
    setPassword: (value: string) => setPasswordState(value),
    setConfirm: (value: string) => setConfirmState(value),
    requirements,
    policySatisfied,
    mismatch,
    reset,
  };
}
