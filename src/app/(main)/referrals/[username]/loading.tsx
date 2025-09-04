import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Skeleton className="h-5 w-20" />
      <header className="space-y-1">
        <Skeleton className="h-7 w-64" />
      </header>
      <div className="border-b border-border">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

