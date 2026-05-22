import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Currency & Time Comparator",
  description:
    "Compare world currencies and current time zones from any base country."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
