"use client";

import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import { Github, Twitter, Discord, Telegram } from "./icons/BrandIcons";

const footerLinks = {
  company: [
    { name: "About us", href: "/about" },
    { name: "Fees and Rates", href: "/fees" },
    { name: "Contact us", href: "/contact" },
    { name: "Download Media Kit", href: "/media-kit" },
  ],
  legal: [
    { name: "Terms of Use", href: "/terms" },
    { name: "Privacy policy", href: "/privacy" },
    { name: "Cookie policy", href: "/cookies" },
  ],
  community: [
    { name: "Twitter / X", href: "https://x.com/Ghostieemoh", icon: Twitter },
    { name: "Discord", href: "https://discord.gg/vertex", icon: Discord },
    { name: "GitHub", href: "https://github.com/Ghostiemoh", icon: Github },
    { name: "Telegram", href: "https://t.me/vertex", icon: Telegram },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-background border-t border-white/5 pt-20 pb-10 overflow-hidden relative precision-glass">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="inline-block group" aria-label="Vertex Home">
              <span className="text-2xl font-black tracking-tighter text-white uppercase group-hover:tracking-[0.1em] transition-all duration-500">
                VER<span className="text-primary italic">TEX</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              The surgical point of finality for the Solana freelance economy. 
              Institutional-grade settlement with consumer-grade simplicity.
            </p>
            <div className="flex items-center gap-2 text-primary/60 text-[10px] font-black uppercase tracking-[0.2em]">
              <Zap className="w-3 h-3 fill-current" />
              Surgical Finality Engine
            </div>
          </div>

          {/* Company Links */}
          <div className="space-y-6">
            <h4 className="text-white text-[12px] font-black uppercase tracking-[0.2em]">Company</h4>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-white/40 hover:text-white transition-colors text-sm flex items-center group gap-2"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-6">
            <h4 className="text-white text-[12px] font-black uppercase tracking-[0.2em]">Legal</h4>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-white/40 hover:text-white transition-colors text-sm flex items-center group gap-2"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div className="space-y-6">
            <h4 className="text-white text-[12px] font-black uppercase tracking-[0.2em]">Community</h4>
            <div className="grid grid-cols-2 gap-4">
              {footerLinks.community.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-white/5 bg-white/[0.02] rounded-xl text-white/40 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center group"
                  title={link.name}
                >
                  {link.icon && <link.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/20 text-[10px] font-medium tracking-widest uppercase">
            &copy; {currentYear} Vertex Infrastructure. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Mainnet Node Active</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
