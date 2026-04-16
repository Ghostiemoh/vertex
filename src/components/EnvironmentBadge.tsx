"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { IS_DEVNET, NETWORK_LABEL, NETWORK_WARNING } from "@/lib/config";

export function EnvironmentBadge({
  className = "",
}: {
  className?: string;
}) {
  const Icon = IS_DEVNET ? AlertTriangle : ShieldCheck;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${
        IS_DEVNET
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      } ${className}`}
      title={NETWORK_WARNING}
    >
      <Icon className="w-3.5 h-3.5" />
      {NETWORK_LABEL}
    </div>
  );
}
