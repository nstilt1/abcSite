"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleUserRound,
  Download,
  FileText,
  Heart,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthState } from "@/hooks/useAuthState";

type NavRoute = {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type ProfileMenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const LOGO_SRC =
  process.env.NEXT_PUBLIC_SITE_LOGO || "/altered-brain-chemistry-logo.png";

const primaryRoutes: NavRoute[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/shop", icon: ShoppingBag },
  { name: "Blog", href: "/blog", icon: FileText },
  { name: "Downloads", href: "/downloads", icon: Download },
];

const signedInMenuItems: ProfileMenuItem[] = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Downloads", href: "/downloads", icon: Download },
  { name: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavbarResponsive() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isAdmin, account, signOut } = useAuthState();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const visibleProfileItems = useMemo(
    () => signedInMenuItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [profileOpen]);

  async function handleSignOut() {
    if (signOut != null)
      await signOut();
    setProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky main-nav top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="content mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Home"
          >
            <div className="relative h-12 w-[200px] overflow-hidden sm:h-14 sm:w-[240px] md:h-16 md:w-[300px]">              <Image
                src={LOGO_SRC}
                alt="Altered Brain Chemistry logo"
                fill
                sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 300px"
                className="object-contain abc-logo-cycle"
                priority
              />
            </div>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 md:flex">
                {primaryRoutes.map((route) => {
                const Icon = route.icon;
                const active = isActiveRoute(pathname, route.href);

                return (
                    <Link key={route.href} href={route.href}>
                    <Button
                        variant="ghost"
                        className={`nav-btn gap-2 ${active ? "nav-btn-active" : ""}`}
                        >
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        {route.name}
                    </Button>
                    </Link>
                );
                })}
            </div>
          <Link href="/support-us" className="hidden md:block">
            <Button className="gap-2 rounded-xl">
              <Heart className="h-4 w-4" />
              Support Us
            </Button>
          </Link>

          {isSignedIn ? (
            <div className="relative hidden md:block" ref={profileMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open profile menu"
                onClick={() => setProfileOpen((value) => !value)}
              >
                <CircleUserRound className="h-5 w-5" />
              </Button>

              {profileOpen ? (
                <div className="absolute right-0 top-12 w-64 rounded-2xl border border-border/60 bg-popover p-2 shadow-xl">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-popover-foreground">
                      {account?.displayName || "Signed in"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Account options
                    </div>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex flex-col">
                    {visibleProfileItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-xl px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setProfileOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="rounded-xl px-3 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[88vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>

                <div className="mt-6 flex flex-col gap-2">
                  {primaryRoutes.map((route) => {
                    const Icon = route.icon;
                    const active = isActiveRoute(pathname, route.href);

                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Button
                          variant={active ? "default" : "ghost"}
                          className="w-full justify-start gap-2"
                        >
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                          {route.name}
                        </Button>
                      </Link>
                    );
                  })}

                  <Link href="/support-us" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full justify-start gap-2 rounded-xl">
                      <Heart className="h-4 w-4" />
                      Support Us
                    </Button>
                  </Link>
                </div>

                {isSignedIn ? (
                  <>
                    <Separator className="my-6" />

                    <div className="mb-3">
                      <div className="text-sm font-medium">{account?.displayName || "Signed in"}</div>
                      <div className="text-xs text-muted-foreground">
                        Account options
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {visibleProfileItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                          >
                            <Button variant="ghost" className="w-full justify-start gap-2">
                              <Icon className="h-4 w-4" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}

                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={async () => {
                          setMobileOpen(false);
                          await handleSignOut();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  </>
                ) : null}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}