"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleUserRound,
  Download,
  FileText,
  Globe,
  Heart,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
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
import { useCart } from "@/hooks/useCart";

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

type ResourcesMenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const LOGO_SRC =
  process.env.NEXT_PUBLIC_SITE_LOGO || "/altered-brain-chemistry-logo.png";

const primaryRoutes: NavRoute[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/shop", icon: ShoppingBag },
];

const signedOutMenuItems: NavRoute[] = [
  { name: "Sign In", href: "/login" },
  { name: "Sign Up", href: "/register" },
];

const resourcesMenuItems: ResourcesMenuItem[] = [
  { name: "Blog", href: "/blog", icon: FileText },
  { name: "Downloads", href: "/downloads", icon: Download },
  { name: "Web Apps", href: "/webapps", icon: Globe },
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
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const [navVisible, setNavVisible] = useState(true);

  const lastScrollY = useRef(0);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const resourcesMenuRef = useRef<HTMLDivElement | null>(null);

  const visibleProfileItems = useMemo(
    () => signedInMenuItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const { cartCount } = useCart();

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (
        resourcesMenuRef.current &&
        !resourcesMenuRef.current.contains(target)
      ) {
        setResourcesOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;

      // Always show near the top
      if (currentScrollY < 16) {
        setNavVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Show when scrolling up
      if (currentScrollY < lastScrollY.current) {
        setNavVisible(true);
      }
      // Hide when scrolling down
      else if (currentScrollY > lastScrollY.current) {
        setNavVisible(false);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleSignOut() {
    if (signOut) {
      await signOut();
    }

    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      className={`sticky top-0 z-50 overflow-visible border-b border-border/60 bg-background/90 backdrop-blur transition-transform duration-300 ${
        navVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center overflow-visible px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex shrink-0 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Home"
        >
          <div className="relative h-12 w-[200px] overflow-hidden sm:h-14 sm:w-[240px] md:h-16 md:w-[300px]">
            <Image
              src={LOGO_SRC}
              alt="Altered Brain Chemistry logo"
              fill
              sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 300px"
              className="object-contain abc-logo-cycle"
              priority
            />
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            {primaryRoutes.map((route) => {
              const Icon = route.icon;
              const active = isActiveRoute(pathname, route.href);

              return (
                <Link key={route.href} href={route.href}>
                  <Button
                    variant="ghost"
                    className={`nav-btn gap-2 ${
                      active ? "nav-btn-active" : ""
                    }`}
                  >
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {route.name}
                  </Button>
                </Link>
              );
            })}

            <div
              ref={resourcesMenuRef}
              className="relative"
              onMouseEnter={() => setResourcesOpen(true)}
              onMouseLeave={() => setResourcesOpen(false)}
            >
              <Button
                type="button"
                variant="ghost"
                className="nav-btn gap-2"
                aria-expanded={resourcesOpen}
                onClick={() => setResourcesOpen((value) => !value)}
              >
                Resources
              </Button>

              {resourcesOpen ? (
              <>
                <div className="absolute left-0 top-full z-[9998] h-2 w-full" />

                <div className="absolute left-1/2 top-full z-[9999] mt-2 w-64 -translate-x-1/2 rounded-2xl border border-border/60 bg-popover p-2 shadow-xl">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-popover-foreground">
                      Resources
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Helpful links and downloads
                    </div>
                  </div>

                  <Separator className="my-1" />

                  <div className="flex flex-col">
                    {resourcesMenuItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="rounded-xl px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setResourcesOpen(false)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                </>
              ) : null}
            </div>

            {!isSignedIn
              ? signedOutMenuItems.map((route) => {
                  const active = isActiveRoute(pathname, route.href);

                  return (
                    <Link key={route.href} href={route.href}>
                      <Button
                        variant="ghost"
                        className={`nav-btn gap-2 ${
                          active ? "nav-btn-active" : ""
                        }`}
                      >
                        {route.name}
                      </Button>
                    </Link>
                  );
                })
              : null}
          </div>

          <Link href="/support-us" className="hidden md:block">
            <Button className="gap-2 rounded-xl">
              <Heart className="h-4 w-4" />
              Support Us
            </Button>
          </Link>

          {isSignedIn ? (
            <div>
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
                <div className="absolute right-0 top-full z-[9999] mt-2 w-64 rounded-2xl border border-border/60 bg-popover p-2 shadow-xl">
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
            <Link href="/cart" className="relative hidden md:inline-flex">
              <Button variant="ghost" size="icon" aria-label="Open cart">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
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
                  <Link href="/support-us" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full justify-start gap-2 rounded-xl">
                      <Heart className="h-4 w-4" />
                      Support Us
                    </Button>
                  </Link>

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
                </div>

                <Separator className="my-6" />

                <div className="mb-3">
                  <div className="text-sm font-medium">Resources</div>
                  <div className="text-xs text-muted-foreground">
                    Helpful links and downloads
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {resourcesMenuItems.map((item) => {
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
                </div>

                {!isSignedIn ? (
                  <>
                    <Separator className="my-6" />

                    <div className="flex flex-col gap-2">
                      {signedOutMenuItems.map((route) => {
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
                              {route.name}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {isSignedIn ? (
                  <>
                    <Separator className="my-6" />

                    <div className="mb-3">
                      <div className="text-sm font-medium">
                        {account?.displayName || "Signed in"}
                      </div>
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
                        onClick={handleSignOut}
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