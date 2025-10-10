export type PasswordRequirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export type PasswordRequirementResult = PasswordRequirement & { met: boolean };

export const PASSWORD_POLICY_REQUIREMENTS: PasswordRequirement[] = [
  { id: "length", label: "At least 8 characters", test: (value) => value.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "One lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "One number", test: (value) => /\d/.test(value) },
  {
    id: "special",
    label: "One special character ($ ! % * ? & )",
    test: (value) => /[\$!%*?&\)]/.test(value),
  },
];

export function evaluatePasswordPolicy(
  value: string,
  requirements: PasswordRequirement[] = PASSWORD_POLICY_REQUIREMENTS,
): PasswordRequirementResult[] {
  return requirements.map((requirement) => ({
    ...requirement,
    met: requirement.test(value),
  }));
}

export function isPasswordPolicySatisfied(
  value: string,
  requirements: PasswordRequirement[] = PASSWORD_POLICY_REQUIREMENTS,
): boolean {
  return requirements.every((requirement) => requirement.test(value));
}

export const PASSWORD_PLACEHOLDER =
  "At least 8 characters with upper, lower, number, and special";
