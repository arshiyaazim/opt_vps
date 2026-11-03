import type { Metadata } from "next";
import localFont from "next/font/local";
const bengali=localFont({src:"./fonts/NotoSansBengali.ttf",variable:"--font-bengali",display:"swap",weight:"100 900"});
import "./globals.css";
import "./workspace.css";
import "./vessel-register.css";
import "./register-skin.css";
import "./conversation-inspector.css";

export const metadata: Metadata = {
  title: "AL-RIFA’I · Integrated Services",
  description: "Private business requests, historical accounts and escort roster review.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className={`${bengali.variable} antialiased`}>{children}</body>
    </html>
  );
}
