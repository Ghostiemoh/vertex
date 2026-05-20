"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import { Download, Send, Plus, Trash2, User, Building, Calendar, Hash, Loader2, ShieldCheck, AlertCircle, Share2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { encodePaymentRequest, generateShortPaymentId, type PaymentToken } from "@/lib/payment-utils";
import { VERTEX_NETWORK } from "@/lib/config";
import { getOrigin } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { logVertexEvent } from "@/lib/monitoring";
import QRCode from "qrcode";
import { useSession } from "@/components/SessionProvider";

type InvoicePdf = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
  internal: jsPDF["internal"] & {
    getNumberOfPages(): number;
  };
};

interface InvoiceItem {
  id: string;
  description: string;
  period: string;
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
  const { user, isAuthenticated } = useSession();
  const { toast } = useToast();
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ id: "1", description: "", period: "", qty: 1, rate: 0 }]);
  const [token, setToken] = useState<PaymentToken>("SOL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMilestone, setIsMilestone] = useState(false);
  const [manualWallet, setManualWallet] = useState("");
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [previewQr, setPreviewQr] = useState("");

  const wasConnectedRef = useRef(false);

  // Wallet disconnect warning: when the user disconnects after having been connected
  // we surface it as a toast so they don't unknowingly issue an unsigned invoice.
  useEffect(() => {
    if (wasConnectedRef.current && !connected) {
      toast(
        "Wallet disconnected. Reconnect or enter a wallet manually to continue.",
        "info"
      );
    }
    wasConnectedRef.current = connected;
  }, [connected, toast]);

  useEffect(() => {
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    setCurrentDate(new Date().toLocaleDateString());
    setMounted(true);
    
    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.["So11111111111111111111111111111111111111112"]?.usdPrice;
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

  useEffect(() => {
    if (mounted && effectiveWallet) {
      const link = `${getOrigin()}/pay/${encodePaymentRequest({
        recipient: effectiveWallet,
        amount: total > 0 ? (isMilestone ? total / 2 : total) : 0,
        token,
        description: `Invoice ${invoiceNumber}`,
        memo: `Vertex-INV:${invoiceNumber}`,
      })}`;
      QRCode.toDataURL(link, { margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } })
        .then(setPreviewQr)
        .catch(() => setPreviewQr(""));
    }
  }, [mounted, effectiveWallet, total, token, invoiceNumber, isMilestone]);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).slice(2), description: "", period: "", qty: 1, rate: 0 }]);
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
    const description = isMilestone
      ? `50% Milestone: Invoice ${invoiceNumber} from ${vendorName}`
      : `Invoice ${invoiceNumber} from ${vendorName}`;
    const memo = `Vertex-INV:${invoiceNumber}|To:${clientName}|Sum:${paymentAmount} ${token}${isMilestone ? "|Milestone" : ""}`;

    // Resolve the payment ID. For authenticated users we insert a payment_requests
    // row keyed on a short random ID, so the URL stays compact (~12 chars). For
    // unauthenticated users (or if the DB insert fails) we fall back to the legacy
    // base64-encoded payload so the link still resolves via the API route's decode
    // fallback. Either way `paymentId` is what ends up in the URL and the QR code.
    let paymentId = "";
    let storedPaymentId: string | null = null;

    if (supabase && isAuthenticated && user?.id) {
      const shortId = generateShortPaymentId();
      const { error: prError } = await supabase.from("payment_requests").insert({
        id: shortId,
        auth_user_id: user.id,
        source: "invoice",
        label: invoiceNumber,
        description,
        network: VERTEX_NETWORK,
        recipient_wallet: effectiveWallet,
        amount: paymentAmount,
        token,
        memo,
        payment_status: "sent",
      });

      if (!prError) {
        paymentId = shortId;
        storedPaymentId = shortId;
      }
    }

    if (!paymentId) {
      paymentId = encodePaymentRequest({
        recipient: effectiveWallet,
        amount: paymentAmount,
        token,
        description,
        memo,
      });
      // storedPaymentId stays null — invoices.payment_id FK requires payment_requests row.
    }

    const paymentLink = `${getOrigin()}/pay/${paymentId}`;
    const qrDataUrl = await QRCode.toDataURL(paymentLink, { margin: 1, width: 300 });
    await new Promise(r => setTimeout(r, 0));

    const doc = new jsPDF() as InvoicePdf;
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Professional Colors
    const black: [number, number, number] = [0, 0, 0];
    const darkGray: [number, number, number] = [60, 60, 60];
    const lightGray: [number, number, number] = [150, 150, 150];
    const lineGray: [number, number, number] = [230, 230, 230];

    let cursorY = 25;

    /* ── HEADER ── */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...black);
    doc.text((vendorName || "MUHAMMAD AUWAL ABDULAZIZ").toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    const headerInfo = [];
    if (vendorAddress) headerInfo.push(`Address: ${vendorAddress.replace(/\n/g, ", ")}`);
    if (vendorPhone) headerInfo.push(`Phone number: ${vendorPhone}`);
    if (vendorEmail) headerInfo.push(`Mail: ${vendorEmail}`);
    
    const headerStr = headerInfo.join(" | ");
    const headerLines = doc.splitTextToSize(headerStr, contentWidth);
    headerLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 4;
    });
    cursorY += 4;

    // Divider
    doc.setDrawColor(...lineGray);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 10;

    /* ── TITLE ── */
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("INVOICE", margin, cursorY);
    cursorY += 15;

    /* ── META INFO (From/To) ── */
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("From:", margin, cursorY);
    doc.text("To:", margin + 95, cursorY);
    cursorY += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);
    const fromText = doc.splitTextToSize(vendorName || "—", 80);
    const toText = doc.splitTextToSize(clientName || "—", 80);
    
    const maxLines = Math.max(fromText.length, toText.length);
    doc.text(fromText, margin, cursorY);
    doc.text(toText, margin + 95, cursorY);
    cursorY += maxLines * 5 + 12;

    // Invoice Details (Number/Date)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(`Invoice Number: ${invoiceNumber}`, margin, cursorY);
    doc.text(`Invoice Date: ${currentDate}`, margin + 95, cursorY);
    cursorY += 5;
    doc.text(`Due Date: ${dueDate} (${Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days from invoice date)`, margin, cursorY);
    cursorY += 12;

    await new Promise(r => setTimeout(r, 0));
    /* ── ITEMS TABLE ── */
    autoTable(doc, {
      startY: cursorY,
      head: [["Description", "Period", "Amount (USD)"]],
      body: items.map(item => [
        item.description || "Service",
        item.period || "—",
        `$${(item.qty * item.rate).toFixed(2)}`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 10,
        halign: "left",
        font: "helvetica"
      },
      bodyStyles: {
        textColor: [60, 60, 60],
        fontSize: 10,
        valign: "middle",
        font: "helvetica"
      },
      columnStyles: {
        2: { halign: "right" }
      },
      margin: { left: margin, right: margin }
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 15;

    /* ── CRYPTO PAYMENT DETAILS ── */
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Crypto Payment Details", margin, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);
    doc.text("Accepted Networks: Solana", margin, cursorY);
    cursorY += 5;
    doc.text(`Preferred Token: ${token}`, margin, cursorY);
    cursorY += 6;
    
    doc.setFont("helvetica", "bold");
    doc.text("Secure Payment Link:", margin, cursorY);
    cursorY += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 102, 204); // Link blue
    const displayLink = paymentId.length > 30
      ? `${getOrigin()}/pay/[Click to Pay Invoice #${invoiceNumber}]`
      : paymentLink;
    const linkLines = doc.splitTextToSize(displayLink, contentWidth - 40); // Leave room for QR
    doc.text(linkLines, margin, cursorY);
    
    // Make text clickable
    doc.link(margin, cursorY - 3, contentWidth - 40, linkLines.length * 4.5 + 2, { url: paymentLink });
    
    // Add "SCAN TO PAY" Section with QR Code
    const qrSize = 40;
    const qrX = pageWidth - margin - qrSize;
    const qrY = cursorY - 12;
    
    // Cute rounded box for QR
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 15, 3, 3, "FD");
    
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...black);
    doc.text("SCAN TO PAY", qrX + qrSize/2, qrY + qrSize + 6, { align: "center" });
    
    cursorY += Math.max(linkLines.length * 4.5 + 10, qrSize + 15);

    /* ── ON-CHAIN METADATA ── */
    // Compact 2-row block. Network + Verify URL live in the Crypto Payment Details
    // section above; this block only adds what isn't already on the invoice.
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("On-Chain Metadata", margin, cursorY);
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);

    const metadataRows: [string, string][] = [
      ["Issuer wallet", effectiveWallet || "—"],
      [
        "Vertex Auth signature",
        signatureBase58 ? `${signatureBase58.slice(0, 32)}...` : "Not signed (vendor wallet not connected at issue)",
      ],
    ];

    const labelColumnWidth = 38;
    metadataRows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margin, cursorY);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value, contentWidth - labelColumnWidth);
      doc.text(wrapped, margin + labelColumnWidth, cursorY);
      cursorY += wrapped.length * 4 + 2;
    });
    cursorY += 4;

    /* ── PAYMENT TERMS ── */
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text("Payment Terms", margin, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkGray);
    const terms = [
      `• Terms: Payment is due within ${dueDate ? Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 7} days of the invoice date as per the agreement.`,
      "• Tax Responsibility: The freelancer is responsible for all applicable taxes.",
      "• Late Payments: Please ensure transfer is completed by the due date to maintain the recurring service cycle."
    ];
    doc.text(terms, margin, cursorY);
    cursorY += terms.length * 5 + 10;

    /* ── NOTES ── */
    if (notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, cursorY);
      cursorY += 5;
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(notes, contentWidth);
      doc.text(noteLines, margin, cursorY);
    }

    await new Promise(r => setTimeout(r, 0));
    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      
      // Simulated 1D Barcode
      const bcX = pageWidth - margin - 35;
      const bcY = 278;
      doc.setDrawColor(0, 0, 0);
      for (let j = 0; j < 35; j++) {
        const w = (j % 3 === 0) ? 0.4 : 0.15;
        doc.setLineWidth(w);
        doc.line(bcX + j * 1, bcY, bcX + j * 1, bcY + 6);
      }
      doc.setFontSize(5);
      doc.setTextColor(150, 150, 150);
      doc.text(invoiceNumber, bcX + 17.5, bcY + 8, { align: "center" });
      
      doc.setFontSize(6);
      doc.setTextColor(...lightGray);
      doc.text("Generated by Vertex - vertex-pay.vercel.app", margin, 285);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 285, { align: "center" });
    }

    await new Promise(r => setTimeout(r, 0));
    // Persist to database
    try {
      if (supabase && isAuthenticated && user?.id) {
        await supabase.from("invoices").insert([{
          auth_user_id: user.id,
          invoice_number: invoiceNumber,
          total,
          token,
          items: items.map(i => ({ description: i.description, qty: i.qty, rate: i.rate, amount: i.qty * i.rate })),
          due_date: dueDate || null,
          // payment_id FKs to payment_requests.id. Only set when the short-ID
          // insert succeeded; for fallback base64 URLs we leave it null to avoid
          // a foreign-key violation.
          payment_id: storedPaymentId,
          payment_payload: { paymentLink, token, amount: total },
          network: VERTEX_NETWORK,
          recipient_wallet: effectiveWallet,
          signature: signatureBase58 || null,
          status: "sent",
        }]);
      }
    } catch {
      // Non-critical: local PDF is already generated
    }

    return { doc, paymentLink, signatureBase58, paymentId };
  };

  /* ── Export Action ── */
  const exportPDF = async () => {
    try {
      setIsGenerating(true);
      const { doc } = await buildPdfDoc();
      doc.save(`Invoice_${invoiceNumber}.pdf`);
      toast("Invoice PDF generated successfully!", "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate PDF.";
      logVertexEvent("invoice_pdf_export_failed", { reason: message }, "error");
      toast(`PDF export failed: ${message}`, "error");
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

      toast(`Invoice emailed to ${clientEmail} successfully!`, "success");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email.";
      logVertexEvent(
        "invoice_email_send_failed",
        { reason: message, clientEmail, invoiceNumber },
        "error"
      );
      toast(`Email send failed: ${message}`, "error");
    } finally {
      setIsSending(false);
    }
  };

  /* ── Social Dispatch Action ── */
  const copySocialLink = async () => {
    try {
      const { paymentLink } = await buildPdfDoc();
      const pct = isMilestone ? " (50% Milestone)" : "";
      const message = `🧾 Invoice #${invoiceNumber} from ${vendorName} for ${total} ${token}${pct}.

Securely view and pay on-chain via Vertex:
${paymentLink}`;
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
                  <input type="text" placeholder="Your Phone Number" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:opacity-30" />
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
                {token === "SOL" && solPrice && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-xl animate-in fade-in duration-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">SOL/USD: <span className="text-primary">${solPrice.toLocaleString()}</span></span>
                  </div>
                )}
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[1fr_100px_60px_100px_36px] gap-3 px-2 text-[9px] font-black uppercase tracking-widest text-white/20">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Rate ({token})</span>
                <span />
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_100px_60px_100px_36px] gap-3 items-center group animate-in slide-in-from-right duration-300">
                    <input type="text" placeholder="e.g. Smart Contract Audit" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.08] transition-all outline-none" />
                    <input type="text" placeholder="Jan 1 - Jan 7" value={item.period} onChange={(e) => updateItem(item.id, "period", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none" />
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

              <div className="bg-white rounded-xl p-10 min-h-[842px] flex flex-col text-black font-sans leading-relaxed border border-zinc-100">
                {/* ── HEADER: Name + contact info line ── */}
                <div className="mb-8 text-center">
                  <h1 className="text-xl font-bold tracking-tight mb-2">{(vendorName || "YOUR NAME / ORGANIZATION").toUpperCase()}</h1>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-md mx-auto">
                    {vendorAddress && <>Address: {vendorAddress.replace(/\n/g, ", ")}.</>}
                    {vendorPhone && <><br />Phone number: {vendorPhone}</>}
                    {vendorEmail && <> | Mail: {vendorEmail}</>}
                  </p>
                  <div className="mt-6 h-px bg-zinc-200" />
                </div>

                {/* ── TITLE ── */}
                <h2 className="text-3xl font-bold tracking-tight mb-10">INVOICE</h2>

                {/* ── FROM / TO (inline, stacked) ── */}
                <div className="space-y-3 mb-8 text-[11px] text-zinc-700">
                  <p><span className="font-bold text-black text-xs">From:</span> {vendorName || "—"} {vendorAddress ? vendorAddress.replace(/\n/g, ", ") : ""}</p>
                  <p><span className="font-bold text-black text-xs">To:</span> {clientName || "—"} {clientAddress ? clientAddress.replace(/\n/g, ", ") : ""}</p>
                </div>

                {/* ── INVOICE DETAILS (stacked, not 2-col) ── */}
                <div className="space-y-2 mb-10 text-[11px]">
                  <p><span className="font-bold text-black text-xs">Invoice Number:</span> <span className="text-zinc-600">{invoiceNumber}</span></p>
                  <p><span className="font-bold text-black text-xs">Invoice Date:</span> <span className="text-zinc-600">{currentDate}</span></p>
                  <p><span className="font-bold text-black text-xs">Due Date:</span> <span className="text-zinc-600">{dueDate || "—"}{dueDate ? ` (${Math.max(0, Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} days from invoice date)` : ""}</span></p>
                </div>

                {/* ── DESCRIPTION OF SERVICES (header + table) ── */}
                <div className="flex-grow mb-10">
                  <h3 className="text-sm font-bold text-black mb-4 uppercase tracking-wide">Description of Services</h3>
                  <table className="w-full text-left border-collapse border border-zinc-200">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="py-3 px-4 text-[11px] font-bold text-black uppercase">Description</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-black uppercase">Period</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-black text-right uppercase">Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-100">
                          <td className="py-4 px-4 text-zinc-700">{item.description || "Service"}</td>
                          <td className="py-4 px-4 text-zinc-500">{item.period || "—"}</td>
                          <td className="py-4 px-4 text-right font-bold text-black text-xs">${(item.qty * item.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── GRAND TOTAL ── */}
                <div className="flex justify-end mb-10">
                  <div className="w-48 space-y-2 text-right">
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>Subtotal ({token})</span>
                      <span>{total.toFixed(4)}</span>
                    </div>
                    <div className="h-px bg-zinc-100" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-black uppercase">Grand Total</span>
                      <div className="text-right">
                        <p className="text-lg font-bold text-black tracking-tighter leading-none">{total.toFixed(4)} {token}</p>
                        {usdEquivalent && (
                          <p className="text-[10px] text-zinc-400 font-medium italic mt-1">
                            Est. ${usdEquivalent} USD
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CRYPTO PAYMENT DETAILS (full-width, stacked) ── */}
                <div className="mb-10">
                  <h3 className="text-sm font-bold text-black mb-3 uppercase tracking-wide">Crypto Payment Details</h3>
                  <div className="space-y-2 text-[11px] text-zinc-700">
                    <p><span className="font-bold">Accepted Networks:</span> Solana</p>
                    <p><span className="font-bold">Preferred Token:</span> {token}</p>
                    <div className="pt-2 flex justify-between items-end gap-6">
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-primary mb-1 text-xs">Secure Payment Link:</p>
                        <a 
                          href={mounted && effectiveWallet ? `${getOrigin()}/pay/${encodePaymentRequest({
                            recipient: effectiveWallet,
                            amount: isMilestone ? total / 2 : total,
                            token,
                            description: `Invoice ${invoiceNumber}`,
                            memo: `Vertex-INV:${invoiceNumber}`,
                          })}` : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[9px] text-zinc-500 break-all leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-100 block hover:bg-zinc-100 transition-colors"
                        >
                          {mounted && effectiveWallet ? `${getOrigin()}/pay/[Click to Pay Invoice #${invoiceNumber}]` : "https://vertex-pay.vercel.app/pay/[auto-generated]"}
                        </a>
                      </div>
                      {previewQr && (
                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                          <div className="w-24 h-24 border-2 border-zinc-100 rounded-2xl overflow-hidden bg-white p-2 shadow-sm hover:shadow-md transition-shadow">
                            <Image src={previewQr} alt="Payment QR" width={96} height={96} unoptimized className="w-full h-full object-contain" />
                          </div>
                          <span className="text-[7px] font-bold text-zinc-400 tracking-widest uppercase">Scan to Pay</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── PAYMENT TERMS (full-width, bullet list) ── */}
                <div className="mb-10">
                  <h3 className="text-sm font-bold text-black mb-3 uppercase tracking-wide">Payment Terms</h3>
                  <ul className="text-[11px] text-zinc-700 space-y-2 list-none">
                    <li>• <span className="font-bold">Terms:</span> Payment is due within {dueDate ? Math.max(0, Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 7} days of the invoice date.</li>
                    <li>• <span className="font-bold">Tax Responsibility:</span> The freelancer is responsible for all applicable taxes.</li>
                    <li>• <span className="font-bold">Late Payments:</span> Please ensure transfer is completed by the due date.</li>
                  </ul>
                </div>

                {/* ── NOTES (inline prefix) ── */}
                {notes && (
                  <div className="pt-6 border-t border-zinc-100">
                    <p className="text-[11px] text-zinc-700 italic"><span className="font-bold not-italic">Notes:</span> {notes}</p>
                  </div>
                )}

                {/* ── PREVIEW FOOTER BARCODE ── */}
                <div className="mt-auto pt-10 border-t border-zinc-100 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vertex Protocol</p>
                    <p className="text-[8px] text-zinc-400 italic">Secure On-Chain Billing & Non-Repudiation</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex gap-[1px]">
                      {[...Array(40)].map((_, i) => (
                        <div key={i} className={`bg-black h-6 ${i % 3 === 0 ? "w-[1.5px]" : "w-[0.5px]"}`} />
                      ))}
                    </div>
                    <span className="text-[7px] text-zinc-400 mt-1 font-mono">{invoiceNumber}</span>
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
                  disabled={isGenerating || isSending || total <= 0 || !effectiveWallet}
                  className="vertex-btn-outline w-full !h-16"
                >
                  <Share2 className="w-5 h-5" />
                  Relay Link
                </button>
              </div>

              <button
                onClick={exportPDF}
                disabled={isGenerating || isSending || total <= 0 || !effectiveWallet}
                className="w-full py-4 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white/40 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Archive (.PDF)
              </button>

              {(() => {
                const missing: string[] = [];
                if (!effectiveWallet) missing.push("Connected wallet (or manual address)");
                if (total <= 0) missing.push("Line item with a non-zero amount");
                if (!clientEmail) missing.push("Client email (Dispatch only)");
                if (!vendorName) missing.push("Vendor name (optional — PDF uses default)");
                if (!clientName) missing.push("Client name (optional — PDF uses placeholder)");
                if (missing.length === 0) return null;
                return (
                  <p className="text-center text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                    Missing: {missing.join(" · ")}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
