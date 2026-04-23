import { Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SupportUsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border">
            <Heart className="h-5 w-5" />
          </div>
          <CardTitle>Support Us</CardTitle>
          <CardDescription>
            Help fund new releases, experiments, and weird ideas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can turn this into a donations page, memberships page, or link it
            to a store collection later.
          </p>
          <Button>Coming soon</Button>
        </CardContent>
      </Card>
    </div>
  );
}