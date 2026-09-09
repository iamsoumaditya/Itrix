import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ITrix — Intelligent IT Ticket Resolution",
  description:
    "Automate internal employee IT helpdesk triage & resolution using your company's own IT documentation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#10b981",
        },
      }}
    >
      <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-[#090D16] text-slate-100 selection:bg-emerald-500 selection:text-white font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
