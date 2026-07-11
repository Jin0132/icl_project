import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ICL Project Hub",
  description: "International Community Lab — shared project dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.className} min-h-screen bg-[#f4f5f7] text-slate-800 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
