import type { Metadata } from "next";
import { Montserrat, Cinzel, Lora } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["400", "600"],
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const brittanySignature = localFont({
  src: "./fonts/BrittanySignature.ttf",
  variable: "--font-brittany-signature",
  weight: "400",
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
    <html
      lang="es"
      className={`${montserrat.variable} ${cinzel.variable} ${lora.variable} ${brittanySignature.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream-50">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
