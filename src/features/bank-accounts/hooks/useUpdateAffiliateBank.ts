"use client";

import * as React from "react";

import { apiFetch, ApiError } from "@/lib/api-client";

import type { CreateAffiliateBankResponse } from "../types";
import { evaluateCreateAffiliateBankResponse } from "../utils";

export type UpdateBankInput = {
  bankAccountId: number;
  bankType: number;
  bankId?: number;
  accountName: string;
  accountNumber: string;
  twofaCode?: string;
};

type UpdateBankResult = {
  success: boolean;
  fieldErrors?: {
    accountName?: string;
    accountNumber?: string;
    twofa?: string;
  };
  message?: string;
};

export function useUpdateAffiliateBank() {
  const [loading, setLoading] = React.useState(false);

  const submit = React.useCallback(async ({ bankAccountId, bankType, bankId, accountName, accountNumber, twofaCode }: UpdateBankInput): Promise<UpdateBankResult> => {
    setLoading(true);
    try {
      const headers: HeadersInit | undefined = twofaCode ? { "x-2fa-code": twofaCode } : undefined;
      const formData = new FormData();
      formData.set("LoginPassword", "");
      formData.set("BankAccountType", "3");
      formData.set("BankAccountId", String(bankAccountId));
      formData.set("SecurityCode", "");
      formData.set("BankId", String(typeof bankId === "number" ? bankId : bankType));
      formData.set("BankAccountNumber", accountNumber);
      formData.set("BankAccountName", accountName);
      formData.set("Balance", "0");
      formData.set("LoginUserName", "");

      const response = await apiFetch<CreateAffiliateBankResponse>("/api/BankAccount/updateaffbankaccount", {
        method: "POST",
        headers,
        body: formData,
      });

      const evaluation = evaluateCreateAffiliateBankResponse(response);
      if (evaluation.success) {
        return { success: true, message: evaluation.message };
      }
      return { success: false, message: evaluation.message, fieldErrors: evaluation.fieldErrors };
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        return { success: false, message: "Invalid request. Please check inputs." };
      }
      const message = error instanceof Error ? error.message : "Failed to update bank details";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading };
}
