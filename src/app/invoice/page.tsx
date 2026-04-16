"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FileText, Download, Send, Plus, Trash2, User, Building, Calendar, Hash, Loader2, ShieldCheck, AlertCircle, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { encodePaymentRequest, type PaymentToken } from "@/lib/payment-utils";
import { getOrigin } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

const TOKEN_OPTIONS: { value: PaymentToken; label: string; color: string }[] = [
  { value: "SOL",  label: "SOL",  color: "bg-primary text-black" },
  { value: "USDC", label: "USDC", color: "bg-white text-black" },
  { value: "USDT", label: "USDT", color: "bg-white text-black" },
];

export default function InvoicePage() {
  const { publicKey, connected, signMessage } = useWallet();
  const { toast } = useToast();
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", qty: 1, rate: 0 }]);
  const [token, setToken] = useState<PaymentToken>("SOL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [manualWallet, setManualWallet] = useState("");
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    setCurrentDate(new Date().toLocaleDateString());
    setMounted(true);
    
    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.data?.["So11111111111111111111111111111111111111112"]?.price;
        if (price) setSolPrice(Number(price));
      } catch {
        // Price fetch is non-critical
      }
    }
    fetchPrices();
  }, []);

  const total = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const usdEquivalent = (() => {
    if (token === "SOL" && solPrice) return (total * solPrice).toFixed(2);
    if (token === "USDC" || token === "USDT") return total.toFixed(2);
    return null;
  })();
  const effectiveWallet = connected ? publicKey?.toBase58() : manualWallet;

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).slice(2), description: "", qty: 1, rate: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  /* ─── Professional PDF Generation Core ─── */
  const buildPdfDoc = async () => {
    if (!effectiveWallet || total <= 0) throw new Error("Invalid parameters");

    let signatureBase58 = "";

    if (connected && signMessage) {
      try {
        const message = `Vertex Auth: ${invoiceNumber} | Total: ${total} ${token} | Date: ${new Date().toLocaleDateString()}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);
        signatureBase58 = Buffer.from(signature).toString("base64");
      } catch {
        toast("Signature skipped — invoice will be generated without verification", "info");
      }
    }

    const paymentAmount = isMilestone ? total / 2 : total;

    const encoded = encodePaymentRequest({
      recipient: effectiveWallet,
      amount: paymentAmount,
      token,
      description: isMilestone ? `50% Milestone: Invoice ${invoiceNumber} from ${vendorName}` : `Invoice ${invoiceNumber} from ${vendorName}`,
      memo: `Vertex-INV:${invoiceNumber}|To:${clientName}|Sum:${paymentAmount} ${token}${isMilestone ? '|Milestone' : ''}`,
    });
    const paymentLink = `${getOrigin()}/pay/${encoded}`;

    const doc = new jsPDF() as jsPDF & { lastAutoTable: { finalY: number } };
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    const accent: [number, number, number] = [121, 241, 241];
    const darkText: [number, number, number] = [10, 10, 10];
    const mutedText: [number, number, number] = [120, 120, 120];
    const lightGray: [number, number, number] = [240, 240, 240];
    const altRowBg: [number, number, number] = [252, 252, 252];

    /* ── Header ── */
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text("Vertex", margin, 22);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    doc.text("Global Liquidity Settlement", margin, 27);

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text("INVOICE", pageWidth - margin, 22, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    doc.text(`#${invoiceNumber}`, pageWidth - margin, 29, { align: "right" });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 34, { align: "right" });
    if (dueDate) doc.text(`Due: ${new Date(dueDate).toLocaleDateString()}`, pageWidth - margin, 39, { align: "right" });

    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);

    /* ── From / Bill To ── */
    const infoY = 54;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedText);
    doc.text("FROM", margin, infoY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text(vendorName || "Your Business", margin, infoY + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    if (vendorEmail) doc.text(vendorEmail, margin, infoY + 11);
    const vendorAddrLines = doc.splitTextToSize(vendorAddress || "", 70);
    doc.text(vendorAddrLines, margin, infoY + (vendorEmail ? 16 : 11));
    if (taxId) doc.text(`Tax ID: ${taxId}`, margin, infoY + (vendorEmail ? 16 : 11) + vendorAddrLines.length * 4 + 2);

    const billX = 120;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedText);
    doc.text("BILL TO", billX, infoY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text(clientName || "Client Name", billX, infoY + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    if (clientEmail) doc.text(clientEmail, billX, infoY + 11);
    const clientAddrLines = doc.splitTextToSize(clientAddress || "", 70);
    doc.text(clientAddrLines, billX, infoY + (clientEmail ? 16 : 11));

    /* ── Line Items Table ── */
    autoTable(doc, {
      startY: 95,
      head: [["Description", "Qty", "Rate", "Amount"]],
      body: items.map(item => [
        item.description || "Service",
        String(item.qty),
        `${item.rate.toFixed(2)} ${token}`,
        `${(item.qty * item.rate).toFixed(2)} ${token}`,
      ]),
      theme: "plain",
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: mutedText,
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      },
      bodyStyles: {
        textColor: darkText,
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      alternateRowStyles: { fillColor: altRowBg },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      tableLineWidth: 0,
      tableLineColor: lightGray,
    });

    const tableEndY = doc.lastAutoTable.finalY;

    /* ── Totals Block (right-aligned) ── */
    const totalBlockX = 130;
    let totalY = tableEndY + 10;

    doc.setDrawColor(...lightGray);
    doc.line(totalBlockX, totalY - 2, pageWidth - margin, totalY - 2);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    doc.text("Subtotal:", totalBlockX, totalY + 5);
    doc.setTextColor(...darkText);
    doc.text(`${total.toFixed(2)} ${token}`, pageWidth - margin, totalY + 5, { align: "right" });

    totalY += 12;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accent);
    doc.text("Total Due:", totalBlockX, totalY + 5);
    doc.text(`${total.toFixed(2)} ${token}`, pageWidth - margin, totalY + 5, { align: "right" });

    if (usdEquivalent) {
      totalY += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text(`~ $${usdEquivalent} USD`, pageWidth - margin, totalY + 5, { align: "right" });
    }

    /* ── Payment Section ── */
    totalY += 20;
    doc.setDrawColor(...lightGray);
    doc.line(margin, totalY, pageWidth - margin, totalY);
    totalY += 8;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedText);
    doc.text("PAYMENT DETAILS", margin, totalY);

    totalY += 7;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkText);
    doc.text(`Pay to: ${effectiveWallet}`, margin, totalY);
    totalY += 5;
    doc.text(`Network: Solana  •  Token: ${token}`, margin, totalY);

    totalY += 8;
    doc.setTextColor(...accent);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const displayLink = paymentLink.length > 80 ? paymentLink.substring(0, 77) + "..." : paymentLink;
    doc.text(`Pay online: ${displayLink}`, margin, totalY, { link: { url: paymentLink } } as Parameters<typeof doc.text>[3]);

    /* ── Notes ── */
    if (notes) {
      totalY += 18;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mutedText);
      doc.text("NOTES", margin, totalY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...darkText);
      const noteLines = doc.splitTextToSize(notes, contentWidth);
      doc.text(noteLines, margin, totalY + 5);
    }

    /* ── Footer ── */
    const footerY = 282;
    doc.setDrawColor(...lightGray);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    doc.setFontSize(6);
    doc.setTextColor(...mutedText);
    doc.text("Generated by Vertex — Vertex.vercel.app", margin, footerY);
    if (signatureBase58) {
      doc.text(`Wallet-signed: ${signatureBase58.slice(0, 44)}...`, margin, footerY + 4);
    }
    doc.text("Page 1 of 1", pageWidth - margin, footerY, { align: "right" });

    // Persist to database
    try {
      if (supabase) {
        await supabase.from("invoices").insert([{
          user_address: effectiveWallet,
          invoice_number: invoiceNumber,
          total,
          token,
          items: items.map(i => ({ description: i.description, qty: i.qty, rate: i.rate, amount: i.qty * i.rate })),
          due_date: dueDate || null,
          payment_id: encoded,
          signature: signatureBase58 || null,
          status: "sent",
        }]);
      }
    } catch {
      console.error("Invoice saved locally but failed to sync to cloud");
    }
    
    return { doc, paymentLink, signatureBase58, encoded };
  };

  /* ── Export Action ── */
  const exportPDF = async () => {
    try {
      setIsGenerating(true);
      const { doc } = await buildPdfDoc();
      doc.save(`Invoice_${invoiceNumber}.pdf`);
      toast("Invoice PDF generated successfully!", "success");
    } catch (e) {
      console.error(e);
      toast("Failed to generate PDF.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Auto Dispatch Action ── */
  const sendToClient = async () => {
    if (!clientEmail) {
      toast("Please provide a client email address.", "error");
      return;
    }
    
    try {
      setIsSending(true);
      toast("Generating and sending invoice...", "info");
      
      const { doc, paymentLink } = await buildPdfDoc();
      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBufferBase64 = Buffer.from(pdfArrayBuffer).toString('base64');
      
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail,
          pdfBase64: pdfBufferBase64,
          invoiceNumber,
          vendorName,
          clientName,
          total,
          token,
          paymentLink,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.mocked) {
        toast("Mock Invoice sent! Check terminal. (Resend API key missing)", "success");
      } else {
        toast(`Invoice emailed to ${clientEmail} successfully!`, "success");
      }
    } catch (e) {
      console.error(e);
      toast("Failed to send email.", "error");
    } finally {
      setIsSending(false);
    }
  };

  /* ── Social Dispatch Action ── */
  const copySocialLink = async () => {
    try {
      const { paymentLink } = await buildPdfDoc();
      const pct = isMilestone ? " (50% Milestone)" : "";
      const message = `🧾 Invoice #${invoiceNumber} from ${vendorName} for ${total} ${token}${pct}.\n\nSecurely view and pay on-chain via Vertex:\n${paymentLink}`;
      await navigator.clipboard.writeText(message);
      toast("WhatsApp/Telegram link copied to clipboard!", "success");
    } catch {
      toast("Failed to generate link.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* ─── Editor Panel ─── */}
        <div className="xl:col-span-7 space-y-8">
          <div>
            <h1 className="text-5xl lg:text-7xl font-black text-white mb-2 tracking-tighter uppercase">Vertex <span className="text-primary italic">INVOICING</span></h1>
            <p className="text-lg text-muted-foreground/50 font-medium italic">High-prestige terminal for global capital settlement.</p>
          </div>

          {/* Wallet Status */}
          <div className={`p-4 rounded-2xl flex items-center justify-between ${connected ? "bg-primary/10 border border-primary/20" : "bg-orange-500/10 border border-orange-500/20"}`}>
            <div className="flex items-center gap-3">
              {connected ? <ShieldCheck className="w-5 h-5 text-primary" /> : <AlertCircle className="w-5 h-5 text-orange-500" />}
              <div>
                <p className="text-sm font-bold text-white">{connected ? "Wallet Connected" : "Manual Mode"}</p>
                <p className="text-xs text-muted-foreground">{connected ? `Using: ${publicKey?.toBase58().slice(0, 8)}...` : "Connect wallet for auto-billing & history."}</p>
              </div>
            </div>
            <WalletMultiButton className="!bg-primary !h-10 !text-xs" />
          </div>

          <div className="bezel-double liquid-glass p-8 rounded-[40px] space-y-8 shadow-2xl">
            {/* Header Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Invoice Number</label>
                <div className="relative">
                  <input type="text" placeholder="INV-2026-0001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
                  <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Due Date</label>
                <div className="relative">
                  <input type="date" title="Due Date" placeholder="Select due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                </div>
              </div>
              {!connected && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500">Recipient Wallet (Manual)</label>
                  <input type="text" placeholder="Enter Solana Address" value={manualWallet} onChange={(e) => setManualWallet(e.target.value)} className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-4 py-3 text-white text-xs font-mono focus:ring-2 focus:ring-orange-500/50 outline-none" />
                </div>
              )}
            </div>

            {/* From / To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> From (Your Details)</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Your Full Legal Name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <input type="email" placeholder="your@email.com" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:opacity-30" />
                  <textarea placeholder="Business Address / Billing Info" rows={2} value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                  <input type="text" placeholder="Tax ID / VAT # / TIN (optional)" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full bg-transparent text-xs text-primary font-bold outline-none placeholder:opacity-20" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Bill To (Client)</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Client Full Legal Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <input type="email" placeholder="client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:opacity-30" />
                  <textarea placeholder="Client Billing Address" rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-6 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Hash className="w-3 h-3" /> Services & Deliverables</label>
                {/* Token Selector */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  {TOKEN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setToken(opt.value)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${token === opt.value ? opt.color + " shadow-lg" : "text-white/40 hover:text-white/60"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_80px_100px_36px] gap-3 px-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Rate ({token})</span>
                <span />
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_80px_100px_36px] gap-3 items-center group animate-in slide-in-from-right duration-300">
                    <input type="text" placeholder="e.g. Smart Contract Audit" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.08] transition-all outline-none" />
                    <input type="number" min="1" placeholder="1" title="Quantity" value={item.qty} onChange={(e) => updateItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 1))} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-center outline-none" />
                    <div className="relative">
                      <input type="number" step="0.01" placeholder="0.00" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white pr-10 text-right outline-none" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-primary/40">{token}</span>
                    </div>
                    <button title="Remove line item" onClick={() => removeItem(item.id)} className="p-2 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-muted-foreground hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2 font-bold text-sm bg-white/[0.01] cursor-pointer">
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary">Notes / Payment Terms (Optional)</label>
              <textarea placeholder="e.g. Net 30. Payment due upon receipt of invoice." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:bg-white/[0.08] transition-all resize-none" />
            </div>
          </div>
        </div>

        {/* ─── Preview + Actions ─── */}
        <div className="xl:col-span-5">
          <div className="sticky top-32 space-y-6">
            <div className="bezel-double liquid-glass p-1 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Live Archive Preview</p>
              </div>

              {/* Clean white PDF preview */}
              <div className="bg-white p-10 min-h-[520px] flex flex-col text-black font-sans text-[10px] selection:bg-primary/20">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-[10px] font-black text-primary tracking-widest">Vertex</p>
                    <p className="text-[7px] text-gray-400 uppercase font-bold">PROTOCOL TERMINAL</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase">INVOICE</h2>
                    <p className="text-[8px] text-gray-400 mt-0.5">#{mounted ? invoiceNumber : "INV-XXXX"}</p>
                    <p className="text-[7px] text-gray-400">{mounted ? currentDate : "00/00/00"}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 mb-6" />

                {/* From / To */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</p>
                    <p className="font-bold text-[9px] text-gray-900">{vendorName || "—"}</p>
                    {vendorEmail && <p className="text-[7px] text-gray-500">{vendorEmail}</p>}
                    <p className="text-[7px] text-gray-400 leading-tight mt-0.5">{vendorAddress || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
                    <p className="font-bold text-[9px] text-gray-900">{clientName || "—"}</p>
                    {clientEmail && <p className="text-[7px] text-gray-500">{clientEmail}</p>}
                    <p className="text-[7px] text-gray-400 leading-tight mt-0.5">{clientAddress || ""}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="flex-grow">
                  <div className="grid grid-cols-[1fr_40px_60px_60px] bg-gray-50 py-1.5 px-2 rounded text-[7px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Description</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <div key={item.id} className={`grid grid-cols-[1fr_40px_60px_60px] py-2 px-2 text-[8px] ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                        <span className="text-gray-800">{item.description || "Service"}</span>
                        <span className="text-center text-gray-600">{item.qty}</span>
                        <span className="text-right text-gray-600">{item.rate.toFixed(2)}</span>
                        <span className="text-right font-bold text-gray-900">{(item.qty * item.rate).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="mt-10 pt-4 border-t border-gray-100">
                  <div className="flex justify-end gap-10 items-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-gray-900 italic tracking-tighter">{total.toFixed(2)} {token}</span>
                  </div>
                  {usdEquivalent && (
                    <p className="text-right text-[8px] text-gray-400 font-mono mt-1">TELEMETRIC ESTIMATE: ${usdEquivalent} USD</p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t border-gray-100 flex justify-between items-end">
                  <div>
                    <p className="text-[7px] text-gray-400">Pay to: <span className="font-mono">{effectiveWallet ? `${effectiveWallet.slice(0, 12)}...` : "—"}</span></p>
                    <p className="text-[6px] text-gray-300 mt-0.5">Generated by Vertex</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                    <FileText className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.08] transition-colors">
                <input
                  type="checkbox"
                  checked={isMilestone}
                  onChange={(e) => setIsMilestone(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 text-primary focus:ring-primary/50 focus:ring-offset-0 bg-transparent"
                />
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">Request 50% Milestone Payment</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Generates payment link for {total > 0 ? total / 2 : 0} {token}.</p>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={sendToClient}
                  disabled={isSending || isGenerating || !clientEmail || total <= 0 || !effectiveWallet}
                  className="vertex-btn w-full !h-16"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Dispatch Email
                </button>

                <button
                  onClick={copySocialLink}
                  disabled={isGenerating || isSending || !vendorName || !clientName || total <= 0 || !effectiveWallet}
                  className="vertex-btn-outline w-full !h-16"
                >
                  <Share2 className="w-5 h-5" />
                  Relay Link
                </button>
              </div>

              <button
                onClick={exportPDF}
                disabled={isGenerating || isSending || !vendorName || !clientName || total <= 0 || !effectiveWallet}
                className="w-full py-4 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Archive (.PDF)
              </button>

              {(!effectiveWallet || !clientEmail) && (
                <p className="text-center text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                  Requires Wallet & Client Email
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
