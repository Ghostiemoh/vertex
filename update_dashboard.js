const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Add useSWR
if (!content.includes('import useSWR')) {
  content = content.replace(
    'import { useCallback, useEffect, useState } from "react";',
    'import { useCallback, useEffect, useState } from "react";\nimport useSWR from "swr";'
  );
}

// Replace the entire Dashboard component body up to the getStatusBadge function
const bodyStart = content.indexOf('export default function Dashboard() {');
const getStatusBadge = content.indexOf('const getStatusBadge = (status: string) => {');

const replacement = `export default function Dashboard() {
  const { user, isAuthenticated } = useSession();
  const { toast } = useToast();
  const isDemo = !isAuthenticated;

  const fetchDashboardData = async () => {
    if (!supabase || !user?.id) throw new Error("No user");

    const { data: invData } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, token, status, payment_id, created_at")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: paymentLinkData } = await supabase
      .from("payment_requests")
      .select("id, label, amount, token, payment_status, created_at")
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { count: contractCount } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("auth_user_id", user.id);

    const { count: clientCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("auth_user_id", user.id);

    const { count: paymentLinkCount } = await supabase
      .from("payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("auth_user_id", user.id);

    const { data: allInvoices } = await supabase
      .from("invoices")
      .select("total, status")
      .eq("auth_user_id", user.id);

    const invoiceStats = (allInvoices as InvoiceStat[] | null) || [];
    const totalInv = invoiceStats
      .filter((item) => mapLegacyInvoiceStatus(item.status) === "payment_finalized")
      .reduce((sum, item) => sum + Number(item.total), 0);
    const totalPending = invoiceStats
      .filter((item) => mapLegacyInvoiceStatus(item.status) !== "payment_finalized")
      .reduce((sum, item) => sum + Number(item.total), 0);

    const invoiceRows = (invData || []).map((invoice) => ({
      ...(invoice),
      kind: "invoice",
    }));
    const paymentRows = (paymentLinkData || []).map((paymentLink) => ({
      id: paymentLink.id,
      invoice_number: paymentLink.label || "Direct payment link",
      total: Number(paymentLink.amount),
      token: paymentLink.token,
      status: paymentLink.payment_status,
      payment_id: paymentLink.id,
      created_at: paymentLink.created_at,
      kind: "payment_link",
    }));

    return {
      recentInvoices: [...invoiceRows, ...paymentRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
      stats: {
        totalInvoiced: totalInv,
        activeContracts: contractCount || 0,
        totalClients: clientCount || 0,
        pendingPayments: totalPending,
        paymentLinks: paymentLinkCount || 0,
      }
    };
  };

  const { data, error, isLoading: swrLoading, mutate } = useSWR(
    !isDemo && user?.id ? ["dashboard", user.id] : null,
    fetchDashboardData,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (error) {
      toast("Failed to load dashboard data. Please try again.", "error");
    }
  }, [error, toast]);

  const recentInvoices = isDemo ? DEMO_INVOICES : (data?.recentInvoices || []);
  const stats = isDemo ? {
    totalInvoiced: 3.5,
    activeContracts: 2,
    totalClients: 3,
    pendingPayments: 1,
    paymentLinks: 2,
  } : (data?.stats || {
    totalInvoiced: 0,
    activeContracts: 0,
    totalClients: 0,
    pendingPayments: 0,
    paymentLinks: 0,
  });
  const isLoading = !isDemo && swrLoading;

  `;

content = content.slice(0, bodyStart) + replacement + content.slice(getStatusBadge);

// Replace the manual fetch call with mutate
content = content.replace(
  /onClick=\{fetchDashboardData\}/g,
  'onClick={() => mutate()}'
);

fs.writeFileSync('src/app/dashboard/page.tsx', content);
