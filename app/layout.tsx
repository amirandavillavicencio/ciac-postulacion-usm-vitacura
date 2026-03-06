import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CIAC USM Vitacura",
  description: "Sistema de postulación y gestión de postulantes CIAC"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
