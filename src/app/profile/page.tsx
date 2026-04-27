import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <RequireAuth>
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Account overview, personal details, and linked sign-in methods.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Show account summary information here.</p>
          <p>Add profile editing, linked login providers, and order shortcuts here.</p>
        </CardContent>
      </Card>
    </div>
    </RequireAuth>
  );
}