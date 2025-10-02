"use client";

type PillProps = { label?: string; status: string | null | undefined };

function classesFor(status: string | null | undefined): string {
  const norm = (status ?? "").toLowerCase();
  if (!norm) return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  if (["approved", "active", "success", "completed", "enabled", "done"].includes(norm)) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }

  if (["pending", "processing", "in review", "submitted", "in progress", "review"].some((token) => norm.includes(token))) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (["rejected", "failed", "error", "inactive", "disabled"].some((token) => norm.includes(token))) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }

  if (["bank", "pledge", "connected"].some((token) => norm.includes(token))) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }

  return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export function StatusPill({ status, label }: PillProps) {
  const text = label ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : "");
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classesFor(status)}`}>
      {text}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const label = s === "onboarding" ? "Onboarding" : s === "deactivated" ? "Deactivated" : "Active";
  const cls = s === "active"
    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
    : s === "deactivated"
      ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function OnboardingBadge({ status }: { status: string }) {
  const label = status;
  const norm = (status || '').toLowerCase();
  const cls = norm.includes('approved') || norm.includes('completed')
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : norm.includes('bank') || norm.includes('pledge')
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function KycStatusBadge({ status }: { status: string | null }) {
  const label = !status ? 'Not started' : (
    status === 'draft' ? 'In progress' :
    status === 'pending' ? 'Submitted' :
    status === 'approved' ? 'Approved' :
    status === 'rejected' ? 'Rejected' : status
  );
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classesFor(status)}`}>{label}</span>;
}
