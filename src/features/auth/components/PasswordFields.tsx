import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordPolicyChecklist } from "@/components/PasswordPolicyChecklist";
import {
  PASSWORD_PLACEHOLDER,
  type PasswordRequirementResult,
} from "@/lib/password-policy";

export type PasswordFieldsProps = {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  disabled?: boolean;
  mismatch?: boolean;
  requirements?: PasswordRequirementResult[];
};

export function PasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  disabled,
  mismatch,
  requirements,
}: PasswordFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={PASSWORD_PLACEHOLDER}
          minLength={8}
          disabled={disabled}
          required
        />
        <PasswordPolicyChecklist value={password} items={requirements} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          minLength={8}
          disabled={disabled}
          required
          placeholder="Confirm new password"
        />
        {mismatch && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
      </div>
    </>
  );
}
