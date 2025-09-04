import { requireUser } from "@/lib/server-auth";
import KycClient from "./KycClient";

export default async function KycPage() {
  await requireUser();
  return <KycClient />
}

