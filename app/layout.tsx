import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mother Care Hospital — Staff Management",
  description: "Hospital staff management system for Mother Care Hospital. Attendance, duty allocation, OT requests, leaves, and reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
