import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import NavBar from "@/components/NavbarResponsive";
import { Toaster } from "@/components/ui/sonner";
import SiteFooter from "@/components/SiteFooter";
import { CartProvider } from "@/hooks/useCart";
import AmplifyProvider from "./AmplifyProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Altered Brain Chemistry",
  description: "Products that complement your altered brain chemistry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AmplifyProvider>
          <SiteFooter />

          <CartProvider>
            <div className="site-shell">
              <NavBar />

              <div className="site-inner-content">
                <main className="site-main">{children}</main>
              </div>

              <div aria-hidden="true" className="site-footer-spacer" />
            </div>
          </CartProvider>

          <Toaster />
        </AmplifyProvider>
      </body>
    </html>
  );
}