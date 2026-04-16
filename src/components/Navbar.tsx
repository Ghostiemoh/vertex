"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FileText,
  LayoutGrid,
  Menu,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { WalletAuthButton } from "@/components/WalletAuthButton";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Dashboard", href: "/dashboard", icon: Zap },
  { name: "Get Paid", href: "/get-paid", icon: CreditCard },
  { name: "Invoices", href: "/invoice", icon: FileText },
  { name: "Contracts", href: "/contract", icon: LayoutGrid },
  { name: "Verify", href: "/verify", icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 precision-glass shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center group" aria-label="Vertex Home">
            <span className="text-xl font-black tracking-tighter text-white uppercase group-hover:tracking-[0.1em] transition-all duration-500">
              VER<span className="text-primary italic">TEX</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1 h-full">
            <EnvironmentBadge className="mr-3" />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-5 py-3 text-[12px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center gap-2.5 min-h-[44px]",
                  pathname === link.href
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.name}
              </Link>
            ))}

            <div className="mx-6 h-6 w-px bg-white/10" />

            <div className="flex items-center gap-4">
              <Link
                href="/invoice"
                aria-label="Create New Invoice"
                className="p-3 bg-primary rounded-xl text-black shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <Plus className="w-4.5 h-4.5" />
              </Link>
              <div className="wallet-adapter-wrapper">
                <WalletAuthButton />
              </div>
            </div>
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <WalletAuthButton />
            <button
              title="Toggle navigation menu"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-3 text-white/60 hover:text-white cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden precision-glass border-t border-white/5 p-4 space-y-2">
          <EnvironmentBadge className="mb-3" />
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 text-[12px] font-black uppercase tracking-widest p-4 rounded-xl transition-all min-h-[48px]",
                pathname === link.href
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-white/60 hover:bg-white/5"
              )}
            >
              <link.icon className="w-4.5 h-4.5" />
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
