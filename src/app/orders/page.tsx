import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            View order history, current fulfillment status, and shipment tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>This is a good place for order cards and tracking details.</p>
          <p>You can later connect this page to Stripe + your fulfillment provider.</p>
        </CardContent>
      </Card>
    </div>
  );
}