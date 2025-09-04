import { requireUser } from "@/lib/server-auth";
import ProfileTabs from "./ProfileTabs";
import BackLink from "@/components/BackLink";
import { headers, cookies } from "next/headers";

export default async function ProfilePage() {
  const user = await requireUser();
  let data: any = null;
  try {
    const h = await headers();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const proto = h.get("x-forwarded-proto") || "http";
    const host = h.get("host") || "localhost:3000";
    const url = `${proto}://${host}/api/me/profile`;
    const res = await fetch(url, { cache: "no-store", headers: { Cookie: cookieHeader } });
    data = await res.json().catch(() => null as any);
  } catch {}

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <BackLink className="mb-2" />
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </header>

      <ProfileTabs initial={data ?? { profile: {}, payment: {}, notifications: {} }} />
    </div>
  );
}
