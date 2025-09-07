import { requireUser } from "@/lib/server-auth";
import ProfileTabs from "@/features/profile/components/ProfileTabs";
import { getProfile } from "@/lib/api/users";
import type { ProfileResponse } from "@/types/api";

export default async function ProfilePage() {
  await requireUser();
  let data: ProfileResponse | null = null;
  try {
    data = await getProfile();
  } catch {}

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </header>

      <ProfileTabs initial={{
        profile: data?.profile ?? {},
        payment: data?.payment ?? {},
        notifications: data?.notifications ?? {},
      }} />
    </div>
  );
}
