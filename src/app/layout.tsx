import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@radix-ui/themes/styles.css";
import "./globals.css";

import { AppProviders } from "@/components/providers/AppProviders";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "My Recipe Log",
  description:
    "Mobile-first journal for iterating on bread, drinks, and experimental recipes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface text-foreground antialiased">
        <AppProviders>
          <Header />
          <main className="pt-16">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
