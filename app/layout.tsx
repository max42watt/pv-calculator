import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PV & Wärmepumpe Wirtschaftlichkeitsrechner",
  description: "Berechnen Sie die Wirtschaftlichkeit Ihrer PV-Anlage mit Wärmepumpe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
