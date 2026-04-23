import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl border-primary/30">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle>Admin</CardTitle>
          <CardDescription>
            Internal tools, inventory controls, fulfillment oversight, and content management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This page should eventually be protected server-side or via middleware.</p>
          <p>Useful sections could include products, orders, downloads, blog publishing, and user roles.</p>
        </CardContent>
      </Card>
    </div>
  );
}