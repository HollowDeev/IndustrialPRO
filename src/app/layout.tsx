import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpe Gestão Industrial",
  description: "Plataforma SaaS Multi-Tenant para o planejamento e automação MRP I",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
