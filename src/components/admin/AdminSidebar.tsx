"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/downloads", label: "Downloads" },
  { href: "/admin/blogs", label: "Blogs" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/web-apps", label: "Web-apps" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r bg-muted/20">
      <div className="p-4 border-b">
        <div className="text-lg font-semibold">Admin</div>
      </div>

      <nav className="p-2 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}