import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const posts = [
  {
    slug: "serverless-storefront-notes",
    title: "Building a Serverless Storefront",
    description: "Thoughts on moving from traditional CMS tooling to a modern serverless stack.",
  },
  {
    slug: "print-on-demand-workflow",
    title: "Print-on-Demand Workflow",
    description: "How order capture, fulfillment, and tracking can fit together cleanly.",
  },
  {
    slug: "designing-dark-ui",
    title: "Designing a Dark Interface That Stays Readable",
    description: "Spacing, contrast, and visual hierarchy ideas for dark mode across mobile and desktop.",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          News, process notes, technical writeups, and product updates.
        </p>
      </div>

      <div className="grid gap-6">
        {posts.map((post) => (
          <Card key={post.slug} className="rounded-2xl">
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <CardDescription>{post.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/blog/${post.slug}`}>
                <Button variant="secondary">Read more</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}