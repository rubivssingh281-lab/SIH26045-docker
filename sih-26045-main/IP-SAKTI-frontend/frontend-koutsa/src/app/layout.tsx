import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/domain/app-shell";

export const metadata: Metadata = {
  title: "IP-SAKTI Sahayak",
  description: "Evidence-grounded IP and traditional-knowledge research assistant."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <body suppressHydrationWarning>
        <Providers>
          <Suspense fallback={null}><AppShell>{children}</AppShell></Suspense>
        </Providers>
      </body>
    </html>
  );
}
