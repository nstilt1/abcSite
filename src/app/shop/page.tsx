import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/content";

export default function ShopPage() {
  const products = getAllProducts().slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-2 text-muted-foreground">
          Browse products, featured releases, and experimental offerings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <Card key={product.slug} className="rounded-2xl">
            <CardHeader>
              <CardTitle>{product.title || product.slug}</CardTitle>
              <CardDescription>
                {typeof product.shortDescription === "string"
                  ? product.shortDescription
                  : "View this product in the catalog."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/portfolio/products/${product.slug}`}>
                <Button>View product</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}