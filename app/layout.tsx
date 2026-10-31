import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINN — Portfolio intelligence, grounded in evidence",
  description: "A focused portfolio inbox connected to company research and original primary-source documents.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
