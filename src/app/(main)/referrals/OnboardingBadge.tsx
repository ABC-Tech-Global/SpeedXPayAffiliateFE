"use client";

export default function OnboardingBadge({ status }: { status: string }) {
  const label = status;
  const norm = (status || '').toLowerCase();
  const cls = norm.includes('approved') || norm.includes('completed')
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : norm.includes('bank') || norm.includes('pledge')
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

