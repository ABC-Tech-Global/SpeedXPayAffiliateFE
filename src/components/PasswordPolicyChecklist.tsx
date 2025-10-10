import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  PasswordRequirement,
  PasswordRequirementResult,
} from "@/lib/password-policy";
import {
  PASSWORD_POLICY_REQUIREMENTS,
  evaluatePasswordPolicy,
} from "@/lib/password-policy";

type PasswordPolicyChecklistProps = {
  value?: string;
  items?: PasswordRequirementResult[];
  requirements?: PasswordRequirement[];
  className?: string;
};

export function PasswordPolicyChecklist({
  value,
  items,
  requirements = PASSWORD_POLICY_REQUIREMENTS,
  className,
}: PasswordPolicyChecklistProps) {
  const computed = useMemo(
    () => (items ? items : evaluatePasswordPolicy(value ?? "", requirements)),
    [items, value, requirements],
  );

  return (
    <div className={cn("rounded-md bg-muted/60 p-3 text-xs sm:text-sm", className)}>
      <p className="mb-2 text-muted-foreground">Password must include:</p>
      <ul className="space-y-1.5">
        {computed.map((item) => {
          const textClass = item.met ? "text-foreground" : "text-muted-foreground";

          return (
            <li key={item.id} className={textClass}>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
