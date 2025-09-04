import { requireUser } from "@/lib/server-auth";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Profile</h1>
      <div className="rounded-lg border border-border p-4 space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">User ID:</span> {user.id}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Username:</span> {user.username}
        </div>
      </div>
    </div>
  );
}
