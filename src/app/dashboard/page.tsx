"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ProtocolPulse } from "@/components/ProtocolPulse";
import { ReputationWidget } from "@/components/ReputationWidget";
import { Sparkline } from "@/components/Sparkline";
import { WalletAuthButton } from "@/components/WalletAuthButton";
import { useSession } from "@/components/SessionProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  total: number;
  token: string;
  status: string;
  payment_id: string | null;
  created_at: string;
}

interface InvoiceStat {
  total: number;
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-white/5", text: "text-white/40", label: "Draft" },
  sent: { bg: "bg-white/10", text: "text-white/60", label: "Sent" },
  viewed: { bg: "bg-primary/20", text: "text-primary", label: "Viewed" },
  payment_pending: { bg: "bg-primary/10", text: "text-primary", label: "Pending" },
  paid: { bg: "bg-primary", text: "text-black", label: "Paid" },
  overdue: { bg: "bg-red-500/20", text: "text-red-400", label: "Overdue" },
};

const DEMO_INVOICES: InvoiceRecord[] = [
  {
    id: "demo-1",
    invoice_number: "INV-2026-4210",
    total: 2.5,
    token: "SOL",
    status: "paid",
    payment_id: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-2",
    invoice_number: "INV-2026-4211",
    total: 500,
    token: "USDC",
    status: "sent",
    payment_id: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-3",
    invoice_number: "INV-2026-4212",
    total: 1,
    token: "SOL",
    status: "payment_pending",
    payment_id: null,
    created_at: new Date().toISOString(),
  },
];

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const { user, isAuthenticated } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    activeContracts: 0,
    totalClients: 0,
    pendingPayments: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isDemo = !connected || !isAuthenticated;

  const fetchDashboardData = useCallback(async () => {
    if (!supabase || (!user?.id && !publicKey)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const ownerKey = user?.id || publicKey?.toBase58();
      const ownerColumn = user ? "auth_user_id" : "user_address";

      const { data: invData } = await supabase
        .from("invoices")
        .select("*")
        .eq(ownerColumn, ownerKey)
        .order("created_at", { ascending: false })
        .limit(5);

      const { count: contractCount } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq(ownerColumn, ownerKey);

      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq(ownerColumn, ownerKey);

      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("total, status")
        .eq(ownerColumn, ownerKey);

      const invoiceStats = (allInvoices as InvoiceStat[] | null) || [];
      const totalInv = invoiceStats
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + Number(item.total), 0);
      const totalPending = invoiceStats
        .filter((item) => item.status !== "paid")
        .reduce((sum, item) => sum + Number(item.total), 0);

      if (invData) setRecentInvoices(invData as InvoiceRecord[]);

      setStats({
        totalInvoiced: totalInv,
        activeContracts: contractCount || 0,
        totalClients: clientCount || 0,
        pendingPayments: totalPending,
      });
    } catch {
      toast("Failed to load dashboard data. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, toast, user]);

  useEffect(() => {
    if (isDemo) {
      setRecentInvoices(DEMO_INVOICES);
      setStats({
        totalInvoiced: 3.5,
        activeContracts: 2,
        totalClients: 3,
        pendingPayments: 1,
      });
      setIsLoading(false);
      return;
    }

    void fetchDashboardData();
  }, [fetchDashboardData, isDemo]);

  const getStatusBadge = (status: string) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.payment_pending;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}
      >
        {status === "paid" && <CheckCircle2 className="w-2.5 h-2.5 mr-1" />}
        {style.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24 architect-surface">
      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-white">You&apos;re viewing demo data</p>
              <p className="text-xs text-muted-foreground">
                Connect your wallet and sign in to view your saved invoices,
                clients, and payments.
              </p>
            </div>
          </div>
          <WalletAuthButton />
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <div className="inline-flex items-center gap-2 py-1 px-2 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest uppercase text-primary mb-4 animate-pulse">
            <Zap className="w-3 h-3" /> {isDemo ? "Preview Mode" : "Signed-In Workspace"}
          </div>
          <h1 className="text-5xl lg:text-8xl font-black text-white mb-3 tracking-tighter leading-none uppercase">
            PAYMENT <span className="text-primary italic">DASHBOARD</span>
          </h1>
          <p className="text-lg text-muted-foreground/50 font-medium italic">
            {isDemo
              ? "Preview your Vertex dashboard with sample data."
              : "Track invoices, clients, and completed crypto payments in one place."}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/invoice" className="vertex-btn">
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
          {!isDemo && (
            <button
              title="Refresh data"
              onClick={fetchDashboardData}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Loader2 className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {[
          {
            label: "Revenue received",
            value: `${stats.totalInvoiced} SOL`,
            icon: TrendingUp,
            color: "text-emerald-500",
            rawColor: "#10b981",
          },
          {
            label: "Agreement drafts",
            value: stats.activeContracts,
            icon: FileCheck,
            color: "text-blue-500",
            rawColor: "#3b82f6",
          },
          {
            label: "Saved clients",
            value: stats.totalClients,
            icon: Users,
            color: "text-purple-500",
            rawColor: "#a855f7",
          },
          {
            label: "Awaiting payment",
            value: `${stats.pendingPayments} SOL`,
            icon: Clock,
            color: "text-orange-500",
            rawColor: "#f59e0b",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bezel-double precision-glass p-8 rounded-[32px] relative overflow-hidden group transition-all ${isDemo ? "opacity-70" : ""}`}
          >
            <Sparkline color={stat.rawColor} />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                {stat.label}
              </p>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {stat.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <div className="precision-glass border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
                  <BarChart3 className="w-6 h-6 text-primary" /> Recent Invoices
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Status of your latest payment requests.
                </p>
              </div>
              <Link
                href="/invoice"
                className="text-[10px] font-black uppercase text-primary tracking-[0.2em] hover:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                Create New <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 border border-white/5 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/20 transition-all">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-base font-black text-white tracking-tight">
                          #{invoice.invoice_number}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-8">
                      <div className="hidden md:block space-y-1">
                        <p className="text-sm font-black text-white tracking-tighter">
                          {invoice.total} {invoice.token}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      {!isDemo && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (invoice.payment_id) {
                                const payLink = `${window.location.origin}/pay/${invoice.payment_id}`;
                                navigator.clipboard.writeText(payLink);
                                toast("Payment link copied to clipboard", "success");
                              } else {
                                toast("No payment link is stored for this invoice.", "info");
                              }
                            }}
                            className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                            title="Copy payment link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {invoice.payment_id && (
                            <Link
                              href={`/pay/${invoice.payment_id}`}
                              className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-32 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 grayscale opacity-50">
                    <AlertCircle className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                    No invoices yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <ProtocolPulse />
          <ReputationWidget />

          <div className="bezel-double precision-glass rounded-[40px] p-10 relative overflow-hidden group hover:bg-primary/5 transition-all">
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                Quick Payments
              </h3>
              <p className="text-xs text-white/50 mb-8 leading-relaxed font-medium">
                Create a new client payment link without opening the full invoice
                builder.
              </p>
              <Link href="/get-paid" className="vertex-btn-outline w-full">
                Generate Link <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="w-40 h-40 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
