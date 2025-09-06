import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function classesFor(status: string | null | undefined, fallback: string = "blue") {
  const s = (status || "").toString().toLowerCase();
  if (!s) return "bg-muted text-foreground/80";
  if (s.includes("approved") || s === "active" || s.includes("completed"))
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (s.includes("reject") || s === "deactivated" || s.includes("error"))
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (s.includes("pending") || s.includes("submitted") || s.includes("waiting"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (s.includes("draft") || s.includes("in progress") || s.includes("progress"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  return fallback === "gray"
    ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
}
