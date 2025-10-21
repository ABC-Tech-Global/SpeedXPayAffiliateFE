"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAffiliateBankOptions } from "../hooks/useAffiliateBankOptions";
import { useCreateAffiliateBank } from "../hooks/useCreateAffiliateBank";
import { useTwoFactorStatus } from "../hooks/useTwoFactorStatus";

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 100;

function validateBankSelection(value: string): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? "" : "Select a bank";
}

function validateAccountHolderName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < ACCOUNT_NAME_MIN || trimmed.length > ACCOUNT_NAME_MAX) {
    return "Account holder name must be 2-100 characters long";
  }
  return "";
}

function validateAccountNumber(value: string): string {
  const trimmed = value.trim();
  return /^\d{8,20}$/.test(trimmed) ? "" : "Account number must be 8-20 digits";
}

function validateTwofaCode(value: string, required: boolean): string {
  if (!required) return "";
  const trimmed = value.trim();
  return /^\d{6}$/.test(trimmed) ? "" : "Enter a valid 6-digit code";
}

export default function AddBankDialogButton() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const { options: bankOptions, loading: banksLoading, error: banksError } = useAffiliateBankOptions(open);
  const twofaEnabled = useTwoFactorStatus(open);
  const { submit: createAffiliateBank, loading: submitLoading } = useCreateAffiliateBank();

  const [selectedBankType, setSelectedBankType] = React.useState("");
  const [accountHolderName, setAccountHolderName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [twofaCode, setTwofaCode] = React.useState("");

  const [bankFieldError, setBankFieldError] = React.useState("");
  const [accountNameError, setAccountNameError] = React.useState("");
  const [accountNumberError, setAccountNumberError] = React.useState("");
  const [twofaError, setTwofaError] = React.useState("");

  const [bankFieldTouched, setBankFieldTouched] = React.useState(false);
  const [accountNameTouched, setAccountNameTouched] = React.useState(false);
  const [accountNumberTouched, setAccountNumberTouched] = React.useState(false);
  const [twofaTouched, setTwofaTouched] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setSelectedBankType("");
    setAccountHolderName("");
    setAccountNumber("");
    setTwofaCode("");
    setBankFieldError("");
    setAccountNameError("");
    setAccountNumberError("");
    setTwofaError("");
    setBankFieldTouched(false);
    setAccountNameTouched(false);
    setAccountNumberTouched(false);
    setTwofaTouched(false);
  }, []);

  React.useEffect(() => {
    if (!twofaEnabled) {
      setTwofaCode("");
      setTwofaError("");
      setTwofaTouched(false);
    }
  }, [twofaEnabled]);

  const handleSubmit = React.useCallback(async () => {
    setBankFieldTouched(true);
    setAccountNameTouched(true);
    setAccountNumberTouched(true);
    if (twofaEnabled) {
      setTwofaTouched(true);
    }

    const trimmedName = accountHolderName.trim();
    const trimmedNumber = accountNumber.trim();

    const bankValidationMessage = validateBankSelection(selectedBankType);
    const nameValidationMessage = validateAccountHolderName(accountHolderName);
    const numberValidationMessage = validateAccountNumber(accountNumber);
    const twofaValidationMessage = validateTwofaCode(twofaCode, twofaEnabled);

    setBankFieldError(bankValidationMessage);
    setAccountNameError(nameValidationMessage);
    setAccountNumberError(numberValidationMessage);
    setTwofaError(twofaValidationMessage);

    if (bankValidationMessage || nameValidationMessage || numberValidationMessage || twofaValidationMessage) {
      return;
    }

    const bankType = Number.parseInt(selectedBankType, 10);

    const { success, message, fieldErrors } = await createAffiliateBank({
      bankType,
      accountName: trimmedName,
      accountNumber: trimmedNumber,
      twofaCode: twofaEnabled ? twofaCode : undefined,
    });

    if (success) {
      toast.success(message || "Bank details saved");
      setOpen(false);
      resetForm();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("onboardingJustCompleted", "1");
      }
      router.refresh();
      return;
    }

    if (fieldErrors?.accountName) setAccountNameError(fieldErrors.accountName);
    if (fieldErrors?.accountNumber) setAccountNumberError(fieldErrors.accountNumber);
    if (fieldErrors?.accountName) setAccountNameTouched(true);
    if (fieldErrors?.accountNumber) setAccountNumberTouched(true);
    if (fieldErrors?.twofa) {
      setTwofaError(fieldErrors.twofa);
      setTwofaTouched(true);
    }

    if (!fieldErrors?.accountName && !fieldErrors?.accountNumber && !fieldErrors?.twofa) {
      toast.error(message || "Failed to add bank details");
    }
  }, [accountHolderName, accountNumber, createAffiliateBank, resetForm, router, selectedBankType, twofaCode, twofaEnabled]);

  const bankValidationMessage = validateBankSelection(selectedBankType);
  const accountNameValidationMessage = validateAccountHolderName(accountHolderName);
  const accountNumberValidationMessage = validateAccountNumber(accountNumber);
  const twofaValidationMessage = validateTwofaCode(twofaCode, twofaEnabled);

  const canSubmit =
    !bankValidationMessage &&
    !accountNameValidationMessage &&
    !accountNumberValidationMessage &&
    !twofaValidationMessage &&
    !banksLoading &&
    !submitLoading;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add details
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payout bank details</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {banksLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className={`space-y-3 ${banksLoading ? "pointer-events-none opacity-50" : ""}`}>
              <div className="grid gap-2">
                <Label htmlFor="bankName">Bank name</Label>
                <Select
                  value={selectedBankType}
                  onValueChange={(value) => {
                    setSelectedBankType(value);
                    setBankFieldTouched(true);
                    setBankFieldError(validateBankSelection(value));
                  }}
                  onOpenChange={(isOpen) => {
                    if (!isOpen) {
                      setBankFieldTouched(true);
                      setBankFieldError(validateBankSelection(selectedBankType));
                    }
                  }}
                  disabled={banksLoading || bankOptions.length === 0}
                >
                  <SelectTrigger
                    id="bankName"
                    className="w-full"
                    aria-invalid={bankFieldTouched && Boolean(bankFieldError)}
                  >
                    <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select a bank"} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map((bank) => (
                      <SelectItem key={bank.type} value={String(bank.type)}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {banksError && <div className="text-xs text-red-600">{banksError}</div>}
                {bankFieldError && <div className="text-xs text-red-600">{bankFieldError}</div>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolderName">Account holder name</Label>
                <Input
                  id="accountHolderName"
                  value={accountHolderName}
                  maxLength={ACCOUNT_NAME_MAX}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAccountHolderName(value);
                    if (accountNameTouched) {
                      setAccountNameError(validateAccountHolderName(value));
                    } else if (accountNameError) {
                      setAccountNameError("");
                    }
                  }}
                  onBlur={(event) => {
                    setAccountNameTouched(true);
                    setAccountNameError(validateAccountHolderName(event.target.value));
                  }}
                  aria-invalid={accountNameTouched && Boolean(accountNameError)}
                  required
                />
                {accountNameError && <div className="text-xs text-red-600">{accountNameError}</div>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bankAccountNumber">Bank account number</Label>
                <Input
                  id="bankAccountNumber"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={20}
                  value={accountNumber}
                  onChange={(event) => {
                    const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 20);
                    setAccountNumber(digitsOnly);
                    if (accountNumberTouched) {
                      setAccountNumberError(validateAccountNumber(digitsOnly));
                    } else if (accountNumberError) {
                      setAccountNumberError("");
                    }
                  }}
                  onBlur={(event) => {
                    setAccountNumberTouched(true);
                    const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 20);
                    setAccountNumber(digitsOnly);
                    setAccountNumberError(validateAccountNumber(digitsOnly));
                  }}
                  aria-invalid={accountNumberTouched && Boolean(accountNumberError)}
                  required
                />
                {accountNumberError && <div className="text-xs text-red-600">{accountNumberError}</div>}
              </div>

              {twofaEnabled && (
                <div className="grid gap-2">
                  <Label htmlFor="twofaCode">Two-factor code</Label>
                  <Input
                    id="twofaCode"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="123456"
                    value={twofaCode}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setTwofaCode(digitsOnly);
                      if (twofaTouched) {
                        setTwofaError(validateTwofaCode(digitsOnly, true));
                      } else if (twofaError) {
                        setTwofaError("");
                      }
                    }}
                    onBlur={(event) => {
                      if (!twofaEnabled) return;
                      setTwofaTouched(true);
                      const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                      setTwofaCode(digitsOnly);
                      setTwofaError(validateTwofaCode(digitsOnly, true));
                    }}
                    aria-invalid={twofaTouched && Boolean(twofaError)}
                  />
                  {twofaError && <div className="text-xs text-red-600">{twofaError}</div>}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
