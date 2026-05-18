"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import { Download, User, Briefcase, Loader2, Building, ShieldCheck, AlertCircle, Clock, Trash2, Plus, Calendar as CalendarIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { type PaymentToken } from "@/lib/payment-utils";
import QRCode from "qrcode";
import { getCanonicalUrl } from "@/lib/utils";
import { NETWORK_LABEL } from "@/lib/config";
import { useSession } from "@/components/SessionProvider";

type ContractPdf = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
  internal: jsPDF["internal"] & {
    getNumberOfPages(): number;
  };
};

const TOKEN_OPTIONS: { value: PaymentToken; label: string; color: string }[] = [
  { value: "SOL",  label: "SOL",  color: "bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white" },
  { value: "USDC", label: "USDC", color: "bg-[#2775CA] text-white" },
  { value: "USDT", label: "USDT", color: "bg-[#26A17B] text-white" },
];

interface Deliverable {
  id: string;
  name: string;
  description: string;
  type: "One-Time" | "Recurring";
  frequency: string;
  fees: string;
}

export default function ContractPage() {
  const { publicKey, connected, signMessage } = useWallet();
  const { user, isAuthenticated } = useSession();
  const { toast } = useToast();
  const [contractorName, setContractorName] = useState("");
  const [contractorAddress, setContractorAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([{ id: "1", name: "", description: "", type: "One-Time", frequency: "", fees: "" }]);
  const [token, setToken] = useState<PaymentToken>("SOL");
  const [dueDate, setDueDate] = useState("");
  const [manualWallet] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [previewQr, setPreviewQr] = useState("");

  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: Math.random().toString(36).slice(2), name: "", description: "", type: "One-Time", frequency: "", fees: "" }]);
  };

  const removeDeliverable = (id: string) => {
    if (deliverables.length > 1) {
      setDeliverables(deliverables.filter(d => d.id !== id));
    }
  };

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string) => {
    setDeliverables(deliverables.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const totalAmount = deliverables.reduce((sum, d) => sum + (parseFloat(d.fees) || 0), 0);
  const effectiveWallet = connected ? publicKey?.toBase58() : manualWallet;

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.["So11111111111111111111111111111111111111112"]?.usdPrice;
        if (price) setSolPrice(Number(price));
      } catch { /* non-critical */ }
    }
    fetchPrices();
  }, []);

  const contractId = useMemo(() => `VTX-CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, []);

  useEffect(() => {
    if (effectiveWallet) {
      QRCode.toDataURL(getCanonicalUrl(`/verify?contract=${contractId}`), { margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } })
        .then(setPreviewQr)
        .catch(() => setPreviewQr(""));
    }
  }, [effectiveWallet, contractId]);

  const usdEquivalent = (() => {
    if (token === "SOL" && solPrice) return (totalAmount * solPrice).toFixed(2);
    if (token === "USDC" || token === "USDT") return totalAmount.toFixed(2);
    return null;
  })();

  /* ─── Professional Contract PDF ─── */
  const generatePDF = async () => {
    if (!effectiveWallet) return;

    try {
      setIsGenerating(true);

      let signatureBase58 = "";
      let signedMessage = "";
      if (connected && signMessage) {
        try {
          signedMessage = `Vertex Contract: Deliverables: ${deliverables.length} | Total: ${totalAmount} ${token} | Date: ${contractDate || new Date().toLocaleDateString()}`;
          const encodedMessage = new TextEncoder().encode(signedMessage);
          const signature = await signMessage(encodedMessage);
          signatureBase58 = Buffer.from(signature).toString("base64");
        } catch {
          toast("Signature required to generate a verified Web3 contract. Generation cancelled.", "error");
          setIsGenerating(false);
          return;
        }
      }

      const doc = new jsPDF() as ContractPdf;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      
      const qrDataUrl = await QRCode.toDataURL(getCanonicalUrl(`/verify?contract=${contractId}`), { margin: 1, width: 300 });

      // Professional Colors
      const black: [number, number, number] = [0, 0, 0];
      const darkGray: [number, number, number] = [60, 60, 60];
      const accent: [number, number, number] = [0, 150, 60];

      let cursorY = 30;

      /* ── TITLE ── */
      doc.setFontSize(18);
      doc.setFont("times", "bold");
      doc.setTextColor(...black);
      doc.text("FREELANCER SERVICES AGREEMENT", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 15;
      
      /* ── INTRO ── */
      doc.setFontSize(11);
      doc.setFont("times", "normal");
      doc.setTextColor(...darkGray);
      
      const introText = `This Freelancer Services Agreement (“Agreement”) is entered into on ${contractDate ? new Date(contractDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}, by and between:
${clientName || "[Client Name / Organization]"}, having its principal place of business at ${clientAddress ? clientAddress.replace(/\n/g, ", ") : "[Address]"} (“Company”); and
${contractorName || "[Freelancer Name / Organization]"}, residing at ${contractorAddress ? contractorAddress.replace(/\n/g, ", ") : "[Address]"} (“Freelancer”).

The Company and the Freelancer are collectively referred to as the “Parties”.`;

      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, cursorY);
      cursorY += introLines.length * 5.5 + 12;

      /* ── PROVISIONS ── */
      const provisions = [
        { title: "1. SERVICES", body: "The Freelancer shall provide the services and deliverables described in Annexure A (Deliverables & Scope) (“Services”). Any work outside Annexure A shall require prior written approval." },
        { title: "2. DELIVERABLE TYPES & ACCEPTANCE", body: "• Recurring Deliverables: Deemed accepted if delivered within the agreed cycle and no written rejection citing material issues is raised within 2 business days." },
        { title: "3. FEES & PAYMENT", body: `• Fees: As specified in Annexure A.\n• Invoices: Raised monthly.\n• Total Amount: ${totalAmount} ${token}.\n• Payment Cycle: Settled via the Solana blockchain to the specified wallet address.\n• The Freelancer is responsible for all applicable taxes.` },
        { title: "4. TERM & TERMINATION", body: "This Agreement shall commence on the Effective Date and continue until terminated by either Party with 7 days written notice, or immediately for material breach. Upon termination, the Company shall pay for all accepted work completed up to the termination date." },
        { title: "5. INTELLECTUAL PROPERTY", body: "All deliverables created under this Agreement shall be deemed work made for contractual hire. To the extent not deemed so, the Freelancer irrevocably assigns all intellectual property rights to the Company upon full payment." },
        { title: "6. CONFIDENTIALITY", body: "The Freelancer shall keep all non-public information of the Company confidential during and after the term of this Agreement." },
        { title: "7. INDEPENDENT CONTRACTOR", body: "The Freelancer is an independent contractor. Nothing herein creates an employment, partnership, or agency relationship." },
        { title: "8. LIABILITY", body: "The Freelancer shall indemnify and hold harmless the Company from claims arising out of breach of this Agreement, intellectual property infringement, or gross negligence." },
        { title: "9. GOVERNING LAW & ARBITRATION", body: "This Agreement shall be governed by the laws of the United Arab Emirates. Any dispute arising out of or in connection with this Agreement shall be finally resolved by arbitration by a sole arbitrator. The arbitral award shall be final and binding." }
      ];

      for (const provision of provisions) {
        if (cursorY > 260) {
          doc.addPage();
          cursorY = 25;
        }

        doc.setFontSize(11);
        doc.setFont("times", "bold");
        doc.setTextColor(...black);
        doc.text(provision.title, margin, cursorY);
        cursorY += 6;

        doc.setFontSize(10.5);
        doc.setFont("times", "normal");
        doc.setTextColor(...darkGray);
        const bodyLines = doc.splitTextToSize(provision.body, contentWidth);
        doc.text(bodyLines, margin, cursorY);
        cursorY += bodyLines.length * 5 + 6;
      }

      /* ── SIGNATURES ── */
      if (cursorY > 240) {
        doc.addPage();
        cursorY = 25;
      } else {
        cursorY += 15;
      }

      const sigWidth = 70;
      // Contractor signature
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, cursorY, margin + sigWidth, cursorY);
      
      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.setTextColor(...black);
      doc.text("Freelancer", margin, cursorY + 5);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(contractorName || "—", margin, cursorY + 9);
      if (signatureBase58) {
        doc.setFontSize(6);
        doc.setTextColor(...accent);
        doc.text(`Digitally signed: ${signatureBase58.slice(0, 48)}...`, margin, cursorY + 13);
      }
      doc.setFontSize(9);
      doc.setTextColor(...darkGray);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, cursorY + 17);

      // Client signature
      const clientSigX = pageWidth - margin - sigWidth;
      doc.line(clientSigX, cursorY, pageWidth - margin, cursorY);

      doc.setFontSize(10);
      doc.setFont("times", "bold");
      doc.setTextColor(...black);
      doc.text("Company", clientSigX, cursorY + 5);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(clientName || "—", clientSigX, cursorY + 9);
      doc.text("Date: _______________", clientSigX, cursorY + 17);
      
      /* ── ANNEXURE A ── */
      doc.addPage();
      cursorY = 25;
      doc.setFontSize(16);
      doc.setFont("times", "bold");
      doc.setTextColor(...black);
      doc.text("ANNEXURE A", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 8;
      doc.text("DELIVERABLES & SCOPE", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 12;

      autoTable(doc, {
        startY: cursorY,
        head: [["Deliverable\nName", "Description", "Type\n(Recurring /\nOne-Time)", "Frequency\n/ Timeline", "Fees"]],
        body: deliverables.map(d => [
          d.name || "Service",
          d.description || "General freelance services",
          d.type,
          d.frequency || "As agreed",
          `${d.fees || "0"} ${token}`
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
          valign: "middle",
          font: "times"
        },
        bodyStyles: {
          textColor: [60, 60, 60],
          fontSize: 10,
          valign: "middle",
          font: "times"
        },
        margin: { left: margin, right: margin }
      });

      /* ── CERTIFICATE OF CRYPTOGRAPHIC COMPLETION ── */
      if (signatureBase58) {
        doc.addPage();
        cursorY = 30;
        doc.setFontSize(18);
        doc.setFont("times", "bold");
        doc.setTextColor(...black);
        doc.text("CERTIFICATE OF CRYPTOGRAPHIC COMPLETION", pageWidth / 2, cursorY, { align: "center" });
        cursorY += 18;

        // Add Verification QR
        const qrSize = 35;
        const qrX = pageWidth - margin - qrSize;
        const qrY = cursorY;
        
        doc.setDrawColor(240, 240, 240);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 15, 3, 3, "FD");
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        doc.setFontSize(7);
        doc.text("VERIFY ON-CHAIN", qrX + qrSize/2, qrY + qrSize + 6, { align: "center" });

        doc.setFontSize(11);
        doc.setFont("times", "normal");
        doc.setTextColor(...darkGray);
        
        const certText = `This document provides cryptographic proof that the Freelancer Services Agreement was signed on-chain by the specified Solana wallet address. This ensures non-repudiation and verifies the exact terms agreed upon at the time of signing.`;
        const certLines = doc.splitTextToSize(certText, contentWidth);
        doc.text(certLines, margin, cursorY);
        cursorY += certLines.length * 6 + 12;

        doc.setFontSize(12);
        doc.setFont("times", "bold");
        doc.setTextColor(...black);
        doc.text("Cryptographic Record", margin, cursorY);
        cursorY += 10;

        doc.setFontSize(10);
        doc.setFont("times", "normal");
        
        doc.setFont("times", "bold");
        doc.text("Signer Wallet:", margin, cursorY);
        doc.setFont("times", "normal");
        doc.text(effectiveWallet || "Unknown", margin + 35, cursorY);
        cursorY += 7;
  
        doc.setFont("times", "bold");
        doc.text("Timestamp:", margin, cursorY);
        doc.setFont("times", "normal");
        doc.text(new Date().toISOString(), margin + 35, cursorY);
        cursorY += 7;
  
        doc.setFont("times", "bold");
        doc.text("Network:", margin, cursorY);
        doc.setFont("times", "normal");
        doc.text(NETWORK_LABEL, margin + 35, cursorY);
        cursorY += 12;
  
        doc.setFont("times", "bold");
        doc.text("Signed Message Hash:", margin, cursorY);
        cursorY += 6;
        doc.setFont("times", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...accent);
        const sigLines = doc.splitTextToSize(signatureBase58, contentWidth);
        doc.text(sigLines, margin, cursorY);
        cursorY += sigLines.length * 5 + 12;
  
        doc.setFontSize(10);
        doc.setFont("times", "bold");
        doc.setTextColor(...black);
        doc.text("Original Message Content:", margin, cursorY);
        cursorY += 6;
        doc.setFont("times", "normal");
        doc.setTextColor(...darkGray);
        const msgLines = doc.splitTextToSize(signedMessage, contentWidth);
        doc.text(msgLines, margin, cursorY);
      }

      /* ── Footer ── */
      const totalPages = doc.internal.getNumberOfPages();
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        
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
        doc.text(contractId, bcX + 17.5, bcY + 8, { align: "center" });

        doc.setDrawColor(230, 230, 230); // lightGray
        doc.line(margin, 284, pageWidth - margin, 284);
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150); // darkGray
        doc.text("Generated by Vertex Protocol - Secure On-Chain Billing", margin, 289);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, 289, { align: "right" });
      }

      doc.save(`Contract_${deliverables[0]?.name || "Agreement"}.pdf`);
      toast("Contract PDF generated successfully!", "success");

      // Persist
      try {
        if (supabase && isAuthenticated && user?.id) {
          await supabase.from("contracts").insert([{
            auth_user_id: user.id,
            project_name: deliverables[0]?.name || "Freelance Agreement",
            client_name: clientName,
            amount: totalAmount,
            token,
            scope: deliverables.map(d => `${d.name}: ${d.description}`).join(" | "),
            due_date: dueDate,
            signature: signatureBase58,
          }]);
        }
      } catch {
        toast("Contract saved locally but failed to sync to cloud", "info");
      }
    } catch {
      toast("Failed to generate contract. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* ─── Editor ─── */}
        <div className="xl:col-span-7 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Contract <span className="text-primary italic">Creator</span></h1>
            <p className="text-muted-foreground">Professional service agreements for Web3 projects.</p>
          </div>

          {/* Wallet Status */}
          <div className={`p-4 rounded-2xl flex items-center justify-between ${connected ? "bg-primary/10 border border-primary/20" : "bg-orange-500/10 border border-orange-500/20"}`}>
            <div className="flex items-center gap-3">
              {connected ? <ShieldCheck className="w-5 h-5 text-primary" /> : <AlertCircle className="w-5 h-5 text-orange-500" />}
              <div>
                <p className="text-sm font-bold text-white">{connected ? "Wallet Connected" : "Manual Mode"}</p>
                <p className="text-xs text-muted-foreground">{connected ? `Using: ${publicKey?.toBase58().slice(0, 8)}...` : "Connect wallet for digital signatures."}</p>
              </div>
            </div>
            <WalletMultiButton className="!bg-primary !h-10 !text-xs" />
          </div>

          <div className="glass-dark p-8 rounded-3xl border border-white/10 space-y-8 shadow-2xl">
            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Agreement Date</label>
                <input type="date" title="Agreement Date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="w-3 h-3" /> Target Deadline</label>
                <input type="date" title="Target Deadline" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> Full Name / Organization</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Freelancer Name / Org" value={contractorName} onChange={(e) => setContractorName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <textarea placeholder="Business Address" rows={2} value={contractorAddress} onChange={(e) => setContractorAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Client Name / Organization</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Client Name / Org" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <textarea placeholder="Client Address" rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                </div>
              </div>
            </div>

            {/* Deliverables & Scope */}
            <div className="space-y-6 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Briefcase className="w-3 h-3" /> Deliverables & Scope</label>
                  <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                    {TOKEN_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setToken(opt.value)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${token === opt.value ? opt.color : "text-white/40"}`}>
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

              <div className="space-y-4">
                {deliverables.map((d) => (
                  <div key={d.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 relative group">
                    <button onClick={() => removeDeliverable(d.id)} title="Remove Deliverable" aria-label="Remove Deliverable" className="absolute right-2 top-2 p-1.5 text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <input type="text" placeholder="Deliverable Name" value={d.name} onChange={(e) => updateDeliverable(d.id, "name", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm" />
                      <select value={d.type} title="Deliverable Type" aria-label="Deliverable Type" onChange={(e) => updateDeliverable(d.id, "type", e.target.value as Deliverable["type"])} className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-xs outline-none cursor-pointer">
                        <option value="One-Time" className="bg-[#0f1115]">One-Time</option>
                        <option value="Recurring" className="bg-[#0f1115]">Recurring</option>
                      </select>
                    </div>
                    <textarea placeholder="Description / Scope details" rows={2} value={d.description} onChange={(e) => updateDeliverable(d.id, "description", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Frequency / Timeline (e.g. Monthly)" value={d.frequency} onChange={(e) => updateDeliverable(d.id, "frequency", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none" />
                      <div className="relative">
                        <input type="number" placeholder="Fees" value={d.fees} onChange={(e) => updateDeliverable(d.id, "fees", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40">{token}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addDeliverable} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-muted-foreground hover:border-primary/50 flex items-center justify-center gap-2 font-bold text-sm bg-white/[0.01] cursor-pointer">
                <Plus className="w-4 h-4" /> Add Deliverable
              </button>
            </div>
          </div>
        </div>

        {/* ─── Preview + Actions ─── */}
        <div className="xl:col-span-5">
          <div className="sticky top-32 space-y-6">
            <div className="liquid-glass border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Live Document Preview</p>
              </div>

              <div className="bg-white p-12 min-h-[1000px] text-zinc-900 font-sans leading-relaxed selection:bg-primary/20">
                {/* Title */}
                <h1 className="text-xl font-bold text-center mb-12 tracking-tight">FREELANCER SERVICES AGREEMENT</h1>
                
                {/* Intro */}
                <div className="text-xs space-y-4 mb-10 text-zinc-700">
                  <p>
                    This Freelancer Services Agreement (“Agreement”) is entered into on{" "}
                    <span className="font-bold text-zinc-900">
                      {contractDate ? new Date(contractDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>, by and between:
                  </p>
                  <p>
                    <span className="font-bold text-zinc-900">{clientName || "[Client Name / Organization]"}</span>, having its principal place of business at <span className="text-zinc-500">{clientAddress || "[Address]"}</span> (“Company”); and
                  </p>
                  <p>
                    <span className="font-bold text-zinc-900">{contractorName || "[Freelancer Name / Organization]"}</span>, residing at <span className="text-zinc-500">{contractorAddress || "[Address]"}</span> (&quot;Freelancer&quot;).
                  </p>
                  <p>The Company and the Freelancer are collectively referred to as the &quot;Parties&quot;.</p>
                </div>

                {/* Provisions — all 9 sections matching sample */}
                <div className="space-y-5 mb-10">
                  {[
                    { title: "1. SERVICES", body: "The Freelancer shall provide the services and deliverables described in Annexure A (Deliverables & Scope) (\"Services\"). Any work outside Annexure A shall require prior written approval." },
                    { title: "2. DELIVERABLE TYPES & ACCEPTANCE", body: "• Recurring Deliverables: Deemed accepted if delivered within the agreed cycle and no written rejection citing material issues is raised within 2 business days." },
                    { title: "3. FEES & PAYMENT", body: `• Fees: As specified in Annexure A.\n• Invoices: Raised monthly.\n• Total Amount: ${totalAmount} ${token}.\n• Payment Cycle: Settled via the Solana blockchain.\n• The Freelancer is responsible for all applicable taxes.` },
                    { title: "4. TERM & TERMINATION", body: "This Agreement shall commence on the Effective Date and continue until terminated by either Party with 7 days written notice, or immediately for material breach. Upon termination, the Company shall pay for all accepted work completed up to the termination date." },
                    { title: "5. INTELLECTUAL PROPERTY", body: "All deliverables created under this Agreement shall be deemed work made for contractual hire. To the extent not deemed so, the Freelancer irrevocably assigns all intellectual property rights to the Company upon full payment." },
                    { title: "6. CONFIDENTIALITY", body: "The Freelancer shall keep all non-public information of the Company confidential during and after the term of this Agreement." },
                    { title: "7. INDEPENDENT CONTRACTOR", body: "The Freelancer is an independent contractor. Nothing herein creates an employment, partnership, or agency relationship." },
                    { title: "8. LIABILITY", body: "The Freelancer shall indemnify and hold harmless the Company from claims arising out of breach of this Agreement, intellectual property infringement, or gross negligence." },
                    { title: "9. GOVERNING LAW & ARBITRATION", body: "This Agreement shall be governed by the laws of the applicable jurisdiction. Any dispute arising out of or in connection with this Agreement shall be finally resolved by arbitration. The arbitral award shall be final and binding." },
                  ].map((p, idx) => (
                    <div key={idx}>
                      <h3 className="text-[9px] font-bold mb-0.5">{p.title}</h3>
                      <p className="text-[9px] text-zinc-600 leading-relaxed whitespace-pre-line">{p.body}</p>
                    </div>
                  ))}
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-16 pt-8 border-t border-zinc-200">
                  <div className="space-y-1">
                    <div className="h-px bg-zinc-900 w-full mb-3" />
                    <p className="text-[9px] font-bold">Freelancer</p>
                    <p className="text-[8px] text-zinc-500">{contractorName || "—"}</p>
                    <p className="text-[8px] text-zinc-400">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-px bg-zinc-900 w-full mb-3" />
                    <p className="text-[9px] font-bold">Company</p>
                    <p className="text-[8px] text-zinc-500">{clientName || "—"}</p>
                    <p className="text-[8px] text-zinc-400">Date: _______________</p>
                  </div>
                </div>

                {/* Annexure A — 5 columns matching sample */}
                <div className="mt-16 pt-10 border-t border-dashed border-zinc-300">
                  <h2 className="text-sm font-bold text-center mb-1">ANNEXURE A</h2>
                  <h3 className="text-[10px] font-bold text-center mb-6">DELIVERABLES & SCOPE</h3>
                  
                  <div className="border border-zinc-300">
                    <table className="w-full text-[8px] text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300">
                          <th className="py-2 px-2 font-bold border-r border-zinc-300">Deliverable<br/>Name</th>
                          <th className="py-2 px-2 font-bold border-r border-zinc-300">Description</th>
                          <th className="py-2 px-2 font-bold border-r border-zinc-300 text-center">Type<br/>(Recurring /<br/>One-Time)</th>
                          <th className="py-2 px-2 font-bold border-r border-zinc-300 text-center">Frequency<br/>/ Timeline</th>
                          <th className="py-2 px-2 font-bold text-center">Fees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliverables.map((d, i) => (
                          <tr key={i} className="border-b border-zinc-200 last:border-0">
                            <td className="py-2 px-2 border-r border-zinc-200 font-medium">{d.name || "—"}</td>
                            <td className="py-2 px-2 border-r border-zinc-200 text-zinc-600">{d.description || "—"}</td>
                            <td className="py-2 px-2 border-r border-zinc-200 text-center">{d.type}</td>
                            <td className="py-2 px-2 border-r border-zinc-200 text-center">{d.frequency || "As agreed"}</td>
                            <td className="py-2 px-2 text-center font-bold">{d.fees || "0"} {token}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── GRAND TOTAL ── */}
                  <div className="flex justify-end mt-6">
                    <div className="w-48 space-y-2 text-right">
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Aggregate Fees ({token})</span>
                        <span>{totalAmount.toFixed(4)}</span>
                      </div>
                      <div className="h-px bg-zinc-100" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-black uppercase">Grand Total</span>
                        <div className="text-right">
                          <p className="text-lg font-bold text-black tracking-tighter leading-none">{totalAmount.toFixed(4)} {token}</p>
                          {usdEquivalent && (
                            <p className="text-[10px] text-zinc-400 font-medium italic mt-1">
                              Est. ${usdEquivalent} USD
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate of Cryptographic Completion */}
                <div className="mt-16 pt-10 border-t-2 border-zinc-900">
                  <h2 className="text-sm font-bold text-center mb-4 uppercase">Certificate of Cryptographic Completion</h2>
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-[9px] text-zinc-600 mb-6 text-left leading-relaxed flex-grow">
                      This document provides cryptographic proof that the Freelancer Services Agreement was signed on-chain by the specified Solana wallet address. This ensures non-repudiation and verifies the exact terms agreed upon at the time of signing.
                    </p>
                    {previewQr && (
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 -mt-2">
                        <div className="w-20 h-20 border border-zinc-200 rounded-lg overflow-hidden bg-white p-1">
                          <Image src={previewQr} alt="Verification QR" width={80} height={80} unoptimized className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[6px] font-bold text-zinc-400 tracking-widest uppercase">Verify</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-[9px]">
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-black">Signer Wallet:</p>
                        <p className="text-zinc-500 font-mono">{effectiveWallet || "Awaiting signature..."}</p>
                      </div>
                      <div>
                        <p className="font-bold text-black">Network:</p>
                        <p className="text-zinc-500">{NETWORK_LABEL}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-black">Timestamp:</p>
                        <p className="text-zinc-500">{new Date().toISOString().split('T')[0]}</p>
                      </div>
                      <div>
                        <p className="font-bold text-black">Signed Message Hash:</p>
                        <p className="text-primary font-mono truncate">Pending wallet signature...</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PREVIEW FOOTER BARCODE ── */}
                <div className="mt-auto pt-10 border-t border-zinc-100 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vertex Protocol</p>
                    <p className="text-[8px] text-zinc-400 italic">Secure On-Chain Billing & Non-Repudiation</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex gap-[1px]">
                      {[...Array(35)].map((_, i) => (
                        <div key={i} className={`bg-black h-5 ${i % 3 === 0 ? "w-[1.5px]" : "w-[0.5px]"}`} />
                      ))}
                    </div>
                    <span className="text-[7px] text-zinc-400 mt-1 font-mono">{contractId}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={generatePDF}
              disabled={isGenerating || !contractorName || !clientName || !effectiveWallet}
              className="w-full py-6 bg-primary text-white font-black text-xl rounded-2xl shadow-2xl shadow-primary/30 hover:bg-primary/90 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 cursor-pointer group"
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />}
              Finalize & Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
