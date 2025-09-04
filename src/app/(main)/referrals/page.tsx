import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReferralsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No referrals yet. This page is wired to auth and ready for data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
