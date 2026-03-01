import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dorm Management Dashboard",
  description: "ระบบจัดการหอพักพร้อม Dashboard, บิล, ใบเสร็จ และ QR พร้อมเพย์"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
