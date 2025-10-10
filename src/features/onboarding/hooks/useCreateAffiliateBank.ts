"use client";

import * as React from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { CreateAffiliateBankResponse } from "../types";
import { evaluateCreateAffiliateBankResponse } from "../utils";

export type CreateBankInput = {
  bankType: number;
  accountName: string;
  accountNumber: string;
  twofaCode?: string;
};

type CreateBankResult = {
  success: boolean;
  fieldErrors?: {
    accountName?: string;
    accountNumber?: string;
    twofa?: string;
  };
  message?: string;
};

export function useCreateAffiliateBank() {
  const [loading, setLoading] = React.useState(false);

  const submit = React.useCallback(async ({ bankType, accountName, accountNumber, twofaCode }: CreateBankInput): Promise<CreateBankResult> => {
    setLoading(true);
    try {
      const headers: HeadersInit | undefined = twofaCode ? { "x-2fa-code": twofaCode } : undefined;
      const formData = new FormData();
      formData.set("BankType", String(bankType));
      formData.set("AccountType", "3");
      formData.set("AccountName", accountName);
      formData.set("AccountNumber", accountNumber);
      formData.set("LoginId", "");
      formData.set("Password", "");
      formData.set("SecurityCode", "");
      formData.set("BankAccountBalance", "");

      const response = await apiFetch<CreateAffiliateBankResponse>("/api/BankAccount/createaffbank", {
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
      const message = error instanceof Error ? error.message : "Failed to add bank details";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading };
}
