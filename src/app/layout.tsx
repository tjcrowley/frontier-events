import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FrontierProvider } from "@/components/FrontierProvider";
import { NewsletterModal } from "@/components/NewsletterModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frontier Events",
  description: "Event ticketing for Frontier Tower makerspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white font-sans">
        <FrontierProvider>
          <NewsletterModal />
          {children}
        </FrontierProvider>
      </body>
    </html>
  );
}
