import type { Metadata } from "next";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Vertex - Crypto invoicing for freelancers",
  description:
    "Create wallet-signed invoices, share payment links, and track freelance payments on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <WalletContextProvider>
          <ToastProvider>
            <SessionProvider>
              <Navbar />
              <main className="flex-grow">{children}</main>
            </SessionProvider>
          </ToastProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
