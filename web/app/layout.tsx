import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@/app/google-analytics";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnlyFling Starter",
  description: "Safe creator operations starter with compliant onboarding, marketplace, plugins, and mobile-first growth loops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <LocaleProvider>
          <SessionProvider>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            {children}
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
