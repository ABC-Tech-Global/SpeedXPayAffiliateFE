"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAffiliateBankOptions } from "../hooks/useAffiliateBankOptions";
import { useCreateAffiliateBank } from "../hooks/useCreateAffiliateBank";
import { useUpdateAffiliateBank } from "../hooks/useUpdateAffiliateBank";
import { useTwoFactorStatus } from "../hooks/useTwoFactorStatus";

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 100;

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

type DialogMode = "create" | "edit";

type BankAccountShape = {
  id: number;
  bankType: number;
  bankId?: number;
  accountName: string;
  accountNumber: string;
};

type AddBankDialogButtonProps = {
  label?: string;
  onSuccess?: () => void | Promise<void>;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  mode?: DialogMode;
  account?: BankAccountShape | null;
};

function validateBankSelection(value: string): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? "" : "Select a bank";
}

function validateAccountHolderName(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Full name must not be empty";
  }

  if (value !== trimmed) {
    return "Full name cannot start or end with spaces";
  }

  if (trimmed.length < ACCOUNT_NAME_MIN || trimmed.length > ACCOUNT_NAME_MAX) {
    return "Full name must be between 2 and 100 characters";
  }

  if (/( {2,}|-{2,}|'{2,}|’{2,})/.test(trimmed)) {
    return "Full name cannot contain consecutive spaces, hyphens, or apostrophes";
  }

  if (/[<>\/\\&%]/.test(trimmed)) {
    return "Full name contains unsupported characters";
  }

  if (/\p{N}/u.test(trimmed)) {
    return "Full name cannot include numbers";
  }

  const allowedPattern = /^[\p{L}\p{M}'’ -]+$/u;

  if (!allowedPattern.test(trimmed)) {
    return "Full name contains unsupported characters";
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

function friendlySubmitError(mode: DialogMode, backendMessage?: string): string {
  const raw = backendMessage?.toLowerCase() ?? "";
  if (raw.includes("duplicate") || raw.includes("already")) {
    return "This bank account already exists. Use a different account number or edit the existing entry.";
  }
  if (raw.includes("invalid request")) {
    return mode === "edit"
      ? "We couldn’t update the bank account. Check the details and try again."
      : "We couldn’t add the bank account. Check the details and try again.";
  }
  if (raw.includes("required")) {
    return "Some required fields are missing. Fill in all fields and try again.";
  }
  return mode === "edit"
    ? "Unable to update the bank account right now. Please try again shortly."
    : "Unable to add the bank account right now. Please try again shortly.";
}

export function AddBankDialogButton({
  label,
  onSuccess,
  disabled,
  variant = "default",
  size = "default",
  className,
  mode = "create",
  account,
}: AddBankDialogButtonProps) {
  const [open, setOpen] = React.useState(false);

  const { options: bankOptions, loading: banksLoading, error: banksError } = useAffiliateBankOptions(open);
  const twofaEnabled = useTwoFactorStatus(open);
  const { submit: createAffiliateBank, loading: submitLoading } = useCreateAffiliateBank();
  const { submit: updateAffiliateBank, loading: updateLoading } = useUpdateAffiliateBank();

  const isEdit = mode === "edit" && Boolean(account);
  const computedLabel = label ?? (isEdit ? "Edit" : "Add bank account");

  const effectiveSubmitLoading = isEdit ? updateLoading : submitLoading;

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
    !effectiveSubmitLoading;

  React.useEffect(() => {
    if (!open) return;
    if (!isEdit || !account) return;
    setSelectedBankType(String(account.bankType));
    setAccountHolderName(account.accountName);
    setAccountNumber(account.accountNumber);
    setBankFieldTouched(false);
    setAccountNameTouched(false);
    setAccountNumberTouched(false);
    setTwofaTouched(false);
    setBankFieldError("");
    setAccountNameError("");
    setAccountNumberError("");
    setTwofaError("");
  }, [account, isEdit, open]);

  const handleSubmit = React.useCallback(async () => {
    setBankFieldTouched(true);
    setAccountNameTouched(true);
    setAccountNumberTouched(true);
    if (twofaEnabled) setTwofaTouched(true);

    const bankValidation = validateBankSelection(selectedBankType);
    const nameValidation = validateAccountHolderName(accountHolderName);
    const numberValidation = validateAccountNumber(accountNumber);
    const twofaValidation = validateTwofaCode(twofaCode, twofaEnabled);

    setBankFieldError(bankValidation);
    setAccountNameError(nameValidation);
    setAccountNumberError(numberValidation);
    setTwofaError(twofaValidation);

    if (bankValidation || nameValidation || numberValidation || twofaValidation) {
      return;
    }

    const bankType = Number.parseInt(selectedBankType, 10);
    const trimmedName = accountHolderName.trim();
    const trimmedNumber = accountNumber.trim();

      if (isEdit && account) {
        const { success, message, fieldErrors } = await updateAffiliateBank({
          bankAccountId: account.id,
          bankType,
          bankId: account.bankId,
          accountName: trimmedName,
          accountNumber: trimmedNumber,
          twofaCode: twofaEnabled ? twofaCode : undefined,
        });

      if (success) {
        toast.success(message || "Bank details updated");
        setOpen(false);
        resetForm();
        try {
          await onSuccess?.();
        } catch {}
        return;
      }

      if (fieldErrors?.accountName) {
        setAccountNameError(fieldErrors.accountName);
        setAccountNameTouched(true);
      }
      if (fieldErrors?.accountNumber) {
        setAccountNumberError(fieldErrors.accountNumber);
        setAccountNumberTouched(true);
      }
      if (fieldErrors?.twofa) {
        setTwofaError(fieldErrors.twofa);
        setTwofaTouched(true);
      }

      if (!fieldErrors?.accountName && !fieldErrors?.accountNumber && !fieldErrors?.twofa) {
        toast.error(friendlySubmitError("edit", message));
      }
      return;
    }

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
      try {
        await onSuccess?.();
      } catch {}
      return;
    }

    if (fieldErrors?.accountName) {
      setAccountNameError(fieldErrors.accountName);
      setAccountNameTouched(true);
    }
    if (fieldErrors?.accountNumber) {
      setAccountNumberError(fieldErrors.accountNumber);
      setAccountNumberTouched(true);
    }
    if (fieldErrors?.twofa) {
      setTwofaError(fieldErrors.twofa);
      setTwofaTouched(true);
    }

    if (!fieldErrors?.accountName && !fieldErrors?.accountNumber && !fieldErrors?.twofa) {
      toast.error(friendlySubmitError("create", message));
    }
  }, [
    accountHolderName,
    accountNumber,
    account,
    createAffiliateBank,
    onSuccess,
    resetForm,
    isEdit,
    updateAffiliateBank,
    selectedBankType,
    twofaCode,
    twofaEnabled,
  ]);

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
      >
        {computedLabel}
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
            <DialogTitle>{isEdit ? "Edit payout bank details" : "Add payout bank details"}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {banksLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                  <SelectTrigger id="bankName">
                    <SelectValue placeholder={bankOptions.length ? "Select a bank" : banksError || "No banks available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map((option) => (
                      <SelectItem key={option.type} value={String(option.type)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bankFieldTouched && bankFieldError && (
                  <p className="text-xs text-destructive">{bankFieldError}</p>
                )}
                {banksError && !bankOptions.length && !banksLoading && (
                  <p className="text-xs text-destructive">{banksError}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolderName">Account holder name</Label>
                <Input
                  id="accountHolderName"
                  value={accountHolderName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAccountHolderName(value);
                    if (accountNameTouched) {
                      setAccountNameError(validateAccountHolderName(value));
                    }
                  }}
                  onBlur={() => {
                    setAccountNameTouched(true);
                    setAccountNameError(validateAccountHolderName(accountHolderName));
                  }}
                  required
                />
                {accountNameTouched && accountNameError && (
                  <p className="text-xs text-destructive">{accountNameError}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account number</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  inputMode="numeric"
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, "");
                    setAccountNumber(value);
                    if (accountNumberTouched) {
                      setAccountNumberError(validateAccountNumber(value));
                    }
                  }}
                  onBlur={() => {
                    setAccountNumberTouched(true);
                    setAccountNumberError(validateAccountNumber(accountNumber));
                  }}
                  required
                />
                {accountNumberTouched && accountNumberError && (
                  <p className="text-xs text-destructive">{accountNumberError}</p>
                )}
              </div>

              {twofaEnabled && (
                <div className="grid gap-2">
                  <Label htmlFor="twofaCode">Two-factor code</Label>
                  <Input
                    id="twofaCode"
                    value={twofaCode}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    onChange={(event) => {
                      const value = event.target.value.replace(/[^0-9]/g, "");
                      setTwofaCode(value);
                      if (twofaTouched) {
                        setTwofaError(validateTwofaCode(value, true));
                      }
                    }}
                    onBlur={() => {
                      setTwofaTouched(true);
                      setTwofaError(validateTwofaCode(twofaCode, true));
                    }}
                  />
                  {twofaTouched && twofaError && (
                    <p className="text-xs text-destructive">{twofaError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {effectiveSubmitLoading ? "Saving…" : isEdit ? "Save changes" : "Save account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddBankDialogButton;
