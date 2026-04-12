import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCH — Staff Management",
  description: "Hospital staff management system for MCH. Attendance, duty allocation, OT requests, leaves, and reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
