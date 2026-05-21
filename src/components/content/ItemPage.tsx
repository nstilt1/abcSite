"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useState } from "react";
import { tiptapDocToHtml } from "@/lib/tiptapToHtml";
import { mediaURL } from "@/lib/mediaURL";
import { useCart } from "@/hooks/useCart";
import { useAuthState } from "@/hooks/useAuthState";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ContentItem, ExtendedItem } from "@/lib/content-types";

interface ItemPageProps {
  item: ExtendedItem;
}

function getHeroImage(item: ExtendedItem) {
  const path = (item.imagePath || item.thumbPath || "") as string;
  return mediaURL(path);
}

export default function ItemPage({ item }: ItemPageProps) {
  if (!item) notFound();

  const { addItem } = useCart();
  const { isSignedIn } = useAuthState();
  const [selectedLicense, setSelectedLicense] = useState<"perpetual" | "trial" | "subscription">("perpetual");
  const [isOpen, setIsOpen] = useState(false);

  const bodyHtml = tiptapDocToHtml(item.tiptap);
  const hero = getHeroImage(item);

  const handleAddToCart = () => {
    if (!isSignedIn) {
      toast.error("Please log in to add items to the cart");
      return;
    }

    const productId = item.productId;
    if (!productId) {
      toast.error("Invalid product ID");
      return;
    }

    addItem({
      productId: productId,
      slug: item.slug,
      name: item.title || item.slug,
      priceCents: item.priceCents || 0,
      quantity: 1,
      licenseType: selectedLicense,
    });

    toast.success(`${item.title || item.slug} added to cart`);
  };

  const renderVariantCard = () => {
    if (item.type === "blogs") return null;

    return (
      <Card className="mt-6 w-full max-w-md">
        <CardHeader>
          <CardTitle>{item.title || item.slug}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {item.type === "webapps" && item.url && (
            <Button asChild variant="outline" className="w-full">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Visit Web App
              </a>
            </Button>
          )}

          {(item.type === "products" || (item.type === "downloads" && item.softwarelicensor)) && (
            <div className="flex flex-col gap-3">
              {item.type === "downloads" && item.softwarelicensor?.licenses && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">License Type</label>
                  <Select 
                    value={selectedLicense} 
                    onValueChange={(val: string) => setSelectedLicense(val as "perpetual" | "trial" | "subscription")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select license" />
                    </SelectTrigger>
                    <SelectContent>
                      {item.softwarelicensor.licenses.map((lic) => (
                        <SelectItem key={lic} value={lic}>
                          {lic.charAt(0).toUpperCase() + lic.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleAddToCart} className="w-full">
                Add to Cart
              </Button>
            </div>
          )}

          {item.type === "downloads" && item.downloads && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full" onClick={() => setIsOpen(true)}>
                  Download
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Downloads</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.downloads.map((dl, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{dl.platform}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              SHA256: {dl.sha256}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" asChild>
                            <a href={dl.url} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{item.title || item.slug}</h1>
          {item.shortDescription && (
            <p className="mt-3 text-muted-foreground">{item.shortDescription}</p>
          )}

          {hero && (
            <div className="mt-6 overflow-hidden rounded-2xl border bg-muted flex justify-center">
              <Image
                src={hero}
                alt={item.title || item.slug}
                width={0}
                height={0}
                className="h-auto w-auto max-w-full"
                sizes="100vw"
                priority
              />
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {renderVariantCard()}
        </div>
      </header>

      <article
        className="prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  );
}
