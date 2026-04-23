import { Download, FileArchive, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const downloads = [
  {
    title: "Desktop Release",
    description: "Current public build for desktop users.",
    icon: Download,
  },
  {
    title: "Release Notes",
    description: "Version history, fixes, and changes.",
    icon: FileText,
  },
  {
    title: "Asset Pack",
    description: "Optional resources and extras.",
    icon: FileArchive,
  },
];

export default function DownloadsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
        <p className="mt-2 text-muted-foreground">
          Public downloads, release files, and related resources.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {downloads.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="rounded-2xl">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Open</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}