import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
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
      className={`${roboto.variable} ${geistMono.variable} ${roboto.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex overflow-hidden bg-slate-50 text-slate-800" style={{ fontFamily: '"Roboto", sans-serif' }} suppressHydrationWarning>

        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
