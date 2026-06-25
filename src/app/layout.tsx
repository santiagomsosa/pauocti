import type { Metadata } from "next";
import { Montserrat, MonteCarlo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const monteCarlo = MonteCarlo({
  variable: "--font-montecarlo",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_COUPLE_NAMES ?? "Boda",
  description: `App del casamiento`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${monteCarlo.variable} h-full antialiased`}>
      <body className="min-h-full bg-terracotta-50">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
