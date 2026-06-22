"use client";

import { Heart, Shield, Coffee, Package, Globe, Server, Code2, Apple, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const BMC_URL = "https://buymeacoffee.com/alteredbrainchemistry";

const costItems = [
  {
    icon: Globe,
    label: "Domain names",
    detail: "~$18/year per domain",
  },
  {
    icon: Server,
    label: "AWS (DynamoDB, Lambda, API Gateway)",
    detail: "Under $5/month",
  },
  {
    icon: Apple,
    label: "Apple Developer subscription",
    detail: "$100/year",
  },
  {
    icon: Code2,
    label: "Azure Trusted / Artifact Signing",
    detail: "$10/month",
  },
];

export default function SupportUsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 space-y-14">

      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-muted">
          <Heart className="h-5 w-5 text-rose-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Support Us</h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
          Altered Brain Chemistry doesn't make money from its software — no ads, no upsells, no paywalls.
          If our tools have helped you, your support goes directly toward keeping them alive and improving them.
        </p>
        <a href={BMC_URL} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="gap-2 mt-2">
            <Coffee className="h-4 w-4" />
            Support Us on Buy Me a Coffee
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </a>
      </div>

      <Separator />

      {/* Privacy commitment */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-semibold">Your data stays yours</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We do not sell your data to any third party — full stop. Any data sharing that occurs is
          strictly necessary for operations. This includes:
        </p>
        <ul className="text-muted-foreground text-sm leading-relaxed space-y-2 list-none pl-0">
          <li className="flex gap-2">
            <span className="mt-0.5 text-foreground font-medium shrink-0">·</span>
            <span>
              <span className="text-foreground font-medium">Hyperformance Solutions</span> — the parent
              company of Altered Brain Chemistry, as required by our Software Licensor to serve licenses.
              Hyperformance Solutions works to operate its services and web apps safely, securely, and at
              acceptable cost.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-foreground font-medium shrink-0">·</span>
            <span>
              <span className="text-foreground font-medium">Payment processors</span> such as{" "}
              <span className="text-foreground font-medium">Stripe</span> — only when you purchase a paid
              product. Payment data is handled directly by the processor and is never stored by us.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-foreground font-medium shrink-0">·</span>
            <span>
              <span className="text-foreground font-medium">Order fulfillment services</span> such as{" "}
              <span className="text-foreground font-medium">Printify</span> or other print-on-demand and
              product delivery partners — only when you order merchandise, and only the information needed
              to produce and ship your order (e.g. name, shipping address).
            </span>
          </li>
        </ul>
      </div>

      <Separator />

      {/* Architecture story */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">From WordPress to serverless</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The Altered Brain Chemistry website started as a WordPress site — which worked, but cost too much
          to justify. We rebuilt it on a fully serverless architecture, cutting hosting costs from{" "}
          <span className="text-foreground font-medium">$15.50/month</span> down to{" "}
          <span className="text-foreground font-medium">$0.50/month</span> for the website alone.
          That's the kind of engineering decision we make to keep things sustainable without cutting corners.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The savings are real, but running software professionally still isn't free. Here's what we pay for
          to keep everything working the way it should:
        </p>
      </div>

      {/* Cost breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {costItems.map(({ icon: Icon, label, detail }) => (
          <Card key={label} className="rounded-xl border bg-muted/40">
            <CardContent className="flex items-start gap-3 py-4 px-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium leading-snug">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Code signing context */}
      <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 px-5 py-4 space-y-1.5">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Why signing matters</p>
        <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
          Without Apple Developer and Azure Trusted Signing subscriptions, our installers would trigger
          SmartScreen warnings on Windows and require users to bypass macOS security mechanisms. Signing
          costs money, but it means you can install our software the normal way.
        </p>
      </div>

      <Separator />

      {/* CTA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-semibold">How you can help</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Donations through Buy Me a Coffee are the most direct way to support this work. We're also
          exploring customizable merchandise — so if you'd like something tangible in return for your
          generosity, that may be coming soon.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Every contribution, no matter the size, helps keep the lights on and lets us keep building.
          Thank you — genuinely.
        </p>
        <a href={BMC_URL} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="gap-2 mt-2">
            <Coffee className="h-4 w-4" />
            Support Us on Buy Me a Coffee
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </a>
      </div>
    </div>
  );
}