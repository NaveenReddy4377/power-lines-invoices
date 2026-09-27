import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Power Lines Electrical Works — Invoice Manager",
  description: "Professional invoice management system for Power Lines Electrical Works",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex overflow-hidden bg-slate-50 text-slate-800" suppressHydrationWarning>

        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
