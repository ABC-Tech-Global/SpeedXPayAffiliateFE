import { requireUser } from "@/lib/server-auth";
import KycClient from "@/features/kyc/components/KycClient";
import BackLink from "@/components/BackLink";

export default async function KycPage() {
  await requireUser();
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <BackLink className="mb-2" />
      <KycClient />
    </div>
  );
}
