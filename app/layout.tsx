import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CIAC Content Classifier",
  description: "Clasificador de contenidos para migración del Aula CIAC"
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
