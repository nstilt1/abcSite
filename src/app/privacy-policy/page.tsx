import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>
            This is a placeholder privacy policy page. Replace this text with your
            actual policy covering account data, analytics, purchases, downloads,
            fulfillment, and support communications.
          </p>
          <p>
            If you use Stripe, Cognito, analytics, or print-on-demand services,
            document that here as well.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}