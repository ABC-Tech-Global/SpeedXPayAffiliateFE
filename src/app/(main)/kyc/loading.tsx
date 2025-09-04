import { Skeleton } from "@/components/ui/skeleton";

export default function KycLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Skeleton className="h-5 w-20" />
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

