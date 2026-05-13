"use client";

import { motion } from "framer-motion";
import { Download, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";

const ease = [0.32, 0.72, 0, 1] as const;

function getResolvedPrimary(): string {
  if (typeof window === "undefined") return "#3FE0C8";
  const probe = document.createElement("div");
  probe.style.color = "var(--primary)";
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return computed || "#3FE0C8";
}

function rgbStringToHex(rgb: string): string {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#3FE0C8";
  const [r, g, b] = m.slice(0, 3).map((n) => Math.round(parseFloat(n)));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function getLogoSVG(theme: "dark" | "light"): string {
  const primary = getResolvedPrimary();
  const text = theme === "dark" ? "#FFFFFF" : "#000000";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 240" width="800" height="240"><text x="400" y="170" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="900" font-size="180" letter-spacing="-10" fill="${text}">VER<tspan font-style="italic" fill="${primary}">TEX</tspan></text></svg>`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function svgToPngBlob(svg: string, scale: number): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG"));
      img.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 800 * scale;
    canvas.height = 240 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

const colors = [
  { name: "Primary Accent", value: "oklch(0.79 0.16 176)", role: "Brand accent, CTAs, highlights — cyan/teal at hue 176°" },
  { name: "Background", value: "oklch(0.13 0 0)", role: "Page background — near-black" },
  { name: "Surface", value: "oklch(0.18 0 0)", role: "Cards, glass panels — dark neutral" },
  { name: "Foreground", value: "oklch(0.97 0 0)", role: "Primary text — off-white" },
  { name: "Muted Foreground", value: "oklch(0.65 0.02 176)", role: "Secondary text, labels" },
];

const typeFaces = [
  { name: "Geist", role: "Primary UI / body text", sample: "Aa Bb Cc 0123" },
  { name: "Satoshi", role: "Headings / display", sample: "VERTEX PAY" },
  { name: "Cabinet Grotesk", role: "Marketing / hero text", sample: "Surgical Finality." },
];

type AssetKind = "svg-dark" | "svg-light" | "png" | "json" | "pdf";

const assets: { label: string; file: string; kind: AssetKind }[] = [
  { label: "Logo — SVG (Dark bg)", file: "vertex-logo-dark.svg", kind: "svg-dark" },
  { label: "Logo — SVG (Light bg)", file: "vertex-logo-light.svg", kind: "svg-light" },
  { label: "Logo — PNG 2x", file: "vertex-logo@2x.png", kind: "png" },
  { label: "Brand Colours — JSON", file: "vertex-colors.json", kind: "json" },
  { label: "Brand Guide — PDF", file: "vertex-brand-guide.pdf", kind: "pdf" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all cursor-pointer"
      title="Copy hex"
    >
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function MediaKitPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const handleDownload = async (kind: AssetKind, filename: string) => {
    if (busy) return;
    setBusy(filename);
    try {
      if (kind === "svg-dark" || kind === "svg-light") {
        const svg = getLogoSVG(kind === "svg-dark" ? "dark" : "light");
        triggerBlobDownload(new Blob([svg], { type: "image/svg+xml" }), filename);
      } else if (kind === "png") {
        const svg = getLogoSVG("dark");
        const blob = await svgToPngBlob(svg, 2);
        triggerBlobDownload(blob, filename);
      } else if (kind === "json") {
        const palette = {
          brand: "Vertex",
          generatedAt: new Date().toISOString(),
          accent: rgbStringToHex(getResolvedPrimary()),
          colors: colors.map((c) => ({
            name: c.name,
            oklch: c.value,
            role: c.role,
          })),
          typography: typeFaces.map((t) => ({ name: t.name, role: t.role })),
        };
        triggerBlobDownload(
          new Blob([JSON.stringify(palette, null, 2)], { type: "application/json" }),
          filename
        );
      } else if (kind === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const primaryHex = rgbStringToHex(getResolvedPrimary());

        // Header band
        doc.setFillColor(13, 13, 13);
        doc.rect(0, 0, pageW, 180, "F");

        doc.setTextColor("#FFFFFF");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(48);
        const ver = "VER";
        const tex = "TEX";
        const verW = doc.getTextWidth(ver);
        doc.text(ver, pageW / 2 - verW, 110);
        doc.setTextColor(primaryHex);
        doc.setFont("helvetica", "bolditalic");
        doc.text(tex, pageW / 2 - verW + verW, 110);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor("#888888");
        doc.text("BRAND GUIDE — V1", pageW / 2, 145, { align: "center" });

        // Body
        let y = 230;
        doc.setTextColor("#000000");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Brand Colours", 50, y);
        y += 8;
        doc.setDrawColor(220, 220, 220);
        doc.line(50, y, pageW - 50, y);
        y += 20;

        for (const c of colors) {
          const probe = document.createElement("div");
          probe.style.background = c.value;
          probe.style.display = "none";
          document.body.appendChild(probe);
          const rgb = getComputedStyle(probe).backgroundColor;
          document.body.removeChild(probe);
          const m = rgb.match(/\d+(\.\d+)?/g);
          if (m && m.length >= 3) {
            const [r, g, b] = m.slice(0, 3).map((n) => parseFloat(n));
            doc.setFillColor(r, g, b);
            doc.rect(50, y - 10, 40, 20, "F");
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor("#111111");
          doc.text(c.name, 100, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor("#666666");
          doc.text(c.value, 100, y + 12);
          y += 32;
        }

        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor("#000000");
        doc.text("Typography", 50, y);
        y += 8;
        doc.setDrawColor(220, 220, 220);
        doc.line(50, y, pageW - 50, y);
        y += 20;

        for (const t of typeFaces) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor("#111111");
          doc.text(t.name, 50, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor("#666666");
          doc.text(t.role, 200, y);
          y += 22;
        }

        // Footer
        doc.setFontSize(7);
        doc.setTextColor("#999999");
        doc.text(
          "Vertex — vertex-pay.vercel.app  ·  Press enquiries: priiincema@gmail.com",
          pageW / 2,
          doc.internal.pageSize.getHeight() - 30,
          { align: "center" }
        );

        doc.save(filename);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <section className="pt-32 pb-24">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6"
          >
            Media Kit
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-5xl lg:text-[5.5rem] font-black tracking-tighter text-white leading-[0.9] mb-8"
          >
            BRAND ASSETS
            <br />
            <span className="text-primary italic">& GUIDELINES.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="text-xl text-white/50 max-w-2xl leading-relaxed"
          >
            Press, media, and partnership usage of the Vertex brand must follow
            the guidelines below. Unauthorised modifications to the logo or
            colour palette are not permitted.
          </motion.p>
        </section>

        {/* Logo */}
        <section className="pb-24">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-10">
            Logotype
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease }}
              className="precision-glass border border-white/5 rounded-[32px] overflow-hidden"
            >
              <div className="bg-[#050505] flex items-center justify-center py-16 px-8">
                <span className="text-4xl font-black tracking-tighter text-white uppercase">
                  VER<span className="text-primary italic">TEX</span>
                </span>
              </div>
              <div className="p-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-white/40 font-bold">Dark background</span>
                <span className="text-[10px] text-white/20 uppercase tracking-widest">Preferred</span>
              </div>
            </motion.div>

            {/* Light */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08, ease }}
              className="precision-glass border border-white/5 rounded-[32px] overflow-hidden"
            >
              <div className="bg-[#FDFBF7] flex items-center justify-center py-16 px-8">
                <span className="text-4xl font-black tracking-tighter text-black uppercase">
                  VER<span className="text-primary italic">TEX</span>
                </span>
              </div>
              <div className="p-5 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-white/40 font-bold">Light background</span>
                <span className="text-[10px] text-white/20 uppercase tracking-widest">Approved</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="mt-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Usage rules
            </p>
            <ul className="space-y-1.5 text-sm text-white/40">
              <li>— Do not stretch, rotate, or alter the proportions of the logo.</li>
              <li>— Do not apply gradients, shadows, or outlines to the logotype.</li>
              <li>— Maintain a clear space equal to the height of the &quot;V&quot; on all sides.</li>
              <li>— Only use on backgrounds within the approved palette.</li>
            </ul>
          </motion.div>
        </section>

        {/* Colours */}
        <section className="pb-24">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-10">
            Brand Colours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {colors.map((c, i) => (
              <motion.div
                key={c.value}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.06, ease }}
                className="precision-glass border border-white/5 rounded-[24px] overflow-hidden"
              >
                <div
                  className="h-24 w-full border-b border-white/5"
                  style={{ backgroundColor: c.value }}
                />
                <div className="p-4 space-y-2">
                  <p className="text-white font-black text-xs">{c.name}</p>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-white/40 truncate">{c.value}</span>
                    <CopyButton value={c.value} />
                  </div>
                  <p className="text-white/30 text-[10px] leading-relaxed">{c.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="pb-24">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-10">
            Typography
          </h2>
          <div className="space-y-4">
            {typeFaces.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 precision-glass border border-white/5 rounded-[24px]"
              >
                <div>
                  <p className="text-white font-black">{t.name}</p>
                  <p className="text-white/30 text-xs mt-0.5">{t.role}</p>
                </div>
                <p className="text-2xl font-black text-white/20 tracking-tight">
                  {t.sample}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Assets Download */}
        <section className="pb-32">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-4">
            Asset Downloads
          </h2>
          <p className="text-white/40 text-sm mb-10 max-w-xl">
            Assets are provided for approved press, media, and partnership use only.
            Contact us before use in commercial contexts outside Vertex-affiliated
            content.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
            className="precision-glass border border-white/5 rounded-[40px] overflow-hidden"
          >
            <div className="divide-y divide-white/5">
              {assets.map((a) => {
                const isBusy = busy === a.file;
                return (
                  <div
                    key={a.file}
                    className="flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <span className="text-white/70 text-sm">{a.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDownload(a.kind, a.file)}
                      disabled={isBusy}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-primary/10 border border-white/10 hover:border-primary/30 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {a.file}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01]">
              <p className="text-xs text-white/20">
                Need a specific format or size?{" "}
                <a
                  href="mailto:priiincema@gmail.com"
                  className="text-primary hover:underline cursor-pointer"
                >
                  Email us
                </a>{" "}
                and we&apos;ll send it directly.
              </p>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
