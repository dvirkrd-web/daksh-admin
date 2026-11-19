import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAKSH ONLINE PRINTING — Admin",
  description:
    "Admin dashboard for DAKSH ONLINE PRINTING. PRINT • PACK • DELIVER",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
