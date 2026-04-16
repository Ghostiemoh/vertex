"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Download, User, Briefcase, Loader2, Building, ShieldCheck, AlertCircle, Clock, Scale, CreditCard } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { type PaymentToken } from "@/lib/payment-utils";

const TOKEN_OPTIONS: { value: PaymentToken; label: string; color: string }[] = [
  { value: "SOL",  label: "SOL",  color: "bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white" },
  { value: "USDC", label: "USDC", color: "bg-[#2775CA] text-white" },
  { value: "USDT", label: "USDT", color: "bg-[#26A17B] text-white" },
];

export default function ContractPage() {
  const { publicKey, connected, signMessage } = useWallet();
  const { toast } = useToast();
  const [contractorName, setContractorName] = useState("");
  const [contractorAddress, setContractorAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [scope, setScope] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<PaymentToken>("SOL");
  const [dueDate, setDueDate] = useState("");
  const [lateFee, setLateFee] = useState("5");
  const [manualWallet, setManualWallet] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  const effectiveWallet = connected ? publicKey?.toBase58() : manualWallet;

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112");
        if (!res.ok) return;
        const data = await res.json();
        const price = data?.data?.["So11111111111111111111111111111111111111112"]?.price;
        if (price) setSolPrice(Number(price));
      } catch { /* non-critical */ }
    }
    fetchPrices();
  }, []);

  const numAmount = parseFloat(amount) || 0;
  const usdEquivalent = (() => {
    if (token === "SOL" && solPrice) return (numAmount * solPrice).toFixed(2);
    if (token === "USDC" || token === "USDT") return numAmount.toFixed(2);
    return null;
  })();

  const contractId = `LMNR-CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

  /* ─── Professional Contract PDF ─── */
  const generatePDF = async () => {
    if (!effectiveWallet) return;

    try {
      setIsGenerating(true);

      let signatureBase58 = "";
      if (connected && signMessage) {
        try {
          const message = `Vertex Contract: ${projectName} | Amount: ${amount} ${token} | Date: ${new Date().toLocaleDateString()}`;
          const encodedMessage = new TextEncoder().encode(message);
          const signature = await signMessage(encodedMessage);
          signatureBase58 = Buffer.from(signature).toString("base64");
        } catch {
          toast("Signature skipped — contract will be generated without verification", "info");
        }
      }

      const doc = new jsPDF();
      const pageWidth = 210;
      const margin = 25;
      const contentWidth = pageWidth - margin * 2;

      const darkText: [number, number, number] = [26, 26, 26];
      const mutedText: [number, number, number] = [107, 114, 128];
      const lightGray: [number, number, number] = [229, 231, 235];
      const accent: [number, number, number] = [0, 200, 83];

      let cursorY = 30;

      /* ── Title ── */
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("SERVICE AGREEMENT", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedText);
      doc.text(`Contract ID: ${contractId}`, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 5;
      doc.text(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageWidth / 2, cursorY, { align: "center" });

      /* ── Divider ── */
      cursorY += 8;
      doc.setDrawColor(...lightGray);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 12;

      /* ── Section 1: Parties ── */
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("1. PARTIES", margin, cursorY);
      cursorY += 8;

      // Two columns
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mutedText);
      doc.text("CONTRACTOR", margin, cursorY);
      doc.text("CLIENT", pageWidth / 2 + 10, cursorY);
      cursorY += 5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text(contractorName || "Contractor Name", margin, cursorY);
      doc.text(clientName || "Client Name", pageWidth / 2 + 10, cursorY);
      cursorY += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedText);
      const contrAddrLines = doc.splitTextToSize(contractorAddress || "—", 65);
      doc.text(contrAddrLines, margin, cursorY);
      const clientAddrLines = doc.splitTextToSize(clientAddress || "—", 65);
      doc.text(clientAddrLines, pageWidth / 2 + 10, cursorY);
      cursorY += Math.max(contrAddrLines.length, clientAddrLines.length) * 4 + 4;

      doc.setFontSize(7);
      doc.setTextColor(...accent);
      doc.text(`Wallet: ${effectiveWallet}`, margin, cursorY);

      /* ── Divider ── */
      cursorY += 10;
      doc.setDrawColor(...lightGray);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;

      /* ── Section 2: Scope ── */
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("2. SCOPE OF WORK", margin, cursorY);
      cursorY += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Project: ${projectName || "Untitled Project"}`, margin, cursorY);
      cursorY += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...mutedText);
      const scopeLines = doc.splitTextToSize(scope || "General freelance services and deliverables as agreed between the parties.", contentWidth);
      doc.text(scopeLines, margin, cursorY);
      cursorY += scopeLines.length * 4.5 + 8;

      /* ── Section 3: Compensation ── */
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("3. COMPENSATION", margin, cursorY);
      cursorY += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkText);
      doc.text(`Total: ${amount || "0"} ${token}`, margin, cursorY);
      if (usdEquivalent) {
        doc.setTextColor(...mutedText);
        doc.text(`(~ $${usdEquivalent} USD)`, margin + 50, cursorY);
      }
      cursorY += 5;
      doc.setTextColor(...darkText);
      doc.text(`Due: ${dueDate ? new Date(dueDate).toLocaleDateString() : "Upon project completion"}`, margin, cursorY);
      cursorY += 5;
      doc.text(`Late fee: ${lateFee}% per 30 days overdue`, margin, cursorY);
      cursorY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.text(`Settlement: Solana blockchain  •  Token: ${token}`, margin, cursorY);

      /* ── Divider ── */
      cursorY += 10;
      doc.setDrawColor(...lightGray);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 10;

      /* ── Section 4: General Provisions ── */
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("4. GENERAL PROVISIONS", margin, cursorY);
      cursorY += 8;

      const provisions = [
        { title: "4.1 Services & Goals", body: "Contractor shall perform the services described in Section 2. Both parties agree to act in good faith to complete the project goals within the agreed timeline." },
        { title: "4.2 Payment & Settlement", body: `Compensation of ${amount || "0"} ${token} is due as per Section 3. Payment via Solana blockchain to the Contractor's designated wallet constitutes final and irrevocable settlement.` },
        { title: "4.3 Intellectual Property", body: "Upon receipt of full payment, all work product, deliverables, and intellectual property created during the engagement shall be irrevocably assigned and transferred to the Client." },
        { title: "4.4 Termination", body: "Either party may terminate this agreement with 7 calendar days' written notice if a material breach remains uncured after reasonable opportunity to remedy." },
        { title: "4.5 Confidentiality", body: "Both parties shall protect all proprietary information, trade secrets, and business data disclosed during the engagement. This obligation survives termination of this agreement." },
        { title: "4.6 Independent Contractor", body: "Contractor operates as an independent entity. Nothing in this agreement creates an employment, partnership, joint venture, or agency relationship between the parties." },
        { title: "4.7 Limitation of Liability", body: "Total liability for either party under this agreement is capped at the total compensation amount stated in Section 3. Neither party shall be liable for indirect, consequential, or punitive damages." },
        { title: "4.8 Dispute Resolution", body: "Any disputes arising from this agreement shall be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under international commercial standards." },
      ];

      for (const provision of provisions) {
        // Page break check
        if (cursorY > 260) {
          doc.addPage();
          cursorY = 25;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkText);
        doc.text(provision.title, margin, cursorY);
        cursorY += 5;

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...mutedText);
        const bodyLines = doc.splitTextToSize(provision.body, contentWidth);
        doc.text(bodyLines, margin, cursorY);
        cursorY += bodyLines.length * 3.8 + 6;
      }

      /* ── Signatures ── */
      if (cursorY > 240) {
        doc.addPage();
        cursorY = 25;
      }

      cursorY += 5;
      doc.setDrawColor(...lightGray);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 12;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("SIGNATURES", margin, cursorY);
      cursorY += 15;

      // Contractor signature
      doc.setDrawColor(...darkText);
      doc.setLineWidth(0.3);
      doc.line(margin, cursorY, margin + 60, cursorY);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Contractor", margin, cursorY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...mutedText);
      doc.text(contractorName || "—", margin, cursorY + 9);
      if (signatureBase58) {
        doc.setFontSize(5);
        doc.setTextColor(...accent);
        doc.text(`Digitally signed: ${signatureBase58.slice(0, 40)}...`, margin, cursorY + 13);
      }
      doc.setFontSize(7);
      doc.setTextColor(...mutedText);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, cursorY + 17);

      // Client signature
      const clientSigX = pageWidth / 2 + 10;
      doc.setDrawColor(...darkText);
      doc.line(clientSigX, cursorY, clientSigX + 60, cursorY);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("Client", clientSigX, cursorY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...mutedText);
      doc.text(clientName || "—", clientSigX, cursorY + 9);
      doc.text("Date: _______________", clientSigX, cursorY + 17);

      /* ── Footer ── */
      const totalPages = doc.getNumberOfPages();
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        doc.setDrawColor(...lightGray);
        doc.line(margin, 284, pageWidth - margin, 284);
        doc.setFontSize(6);
        doc.setTextColor(...mutedText);
        doc.text("Generated by Vertex — Vertex.vercel.app", margin, 289);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, 289, { align: "right" });
      }

      doc.save(`Contract_${projectName || "Agreement"}.pdf`);
      toast("Contract PDF generated successfully!", "success");

      // Persist
      try {
        if (supabase) {
          await supabase.from("contracts").insert([{
            user_address: effectiveWallet,
            project_name: projectName,
            client_name: clientName,
            amount: numAmount,
            token,
            scope,
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
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="w-3 h-3" /> Target Deadline</label>
                <input type="date" title="Target Deadline" placeholder="Select deadline" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
              {!connected && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500">Contractor Wallet (Manual)</label>
                  <input type="text" placeholder="Enter Solana Address" value={manualWallet} onChange={(e) => setManualWallet(e.target.value)} className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-4 py-3 text-white text-xs font-mono focus:ring-2 focus:ring-orange-500/50 outline-none" />
                </div>
              )}
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building className="w-4 h-4 text-primary" /> Contractor Details</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Legal Name" value={contractorName} onChange={(e) => setContractorName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <textarea placeholder="Business Address" rows={2} value={contractorAddress} onChange={(e) => setContractorAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Client Details</h3>
                <div className="space-y-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
                  <input type="text" placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-white font-bold focus:border-primary transition-all outline-none" />
                  <textarea placeholder="Client Address" rows={2} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:opacity-30" />
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-6 pt-8 border-t border-white/5">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Briefcase className="w-3 h-3" /> Scope of Engagement</label>
                <input type="text" placeholder="Project Title" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none" />
                <textarea placeholder="Detailed Scope of Work & Deliverables..." rows={6} value={scope} onChange={(e) => setScope(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:bg-white/[0.08] transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><CreditCard className="w-3 h-3" /> Compensation</label>
                  <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Token</label>
                  <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 h-[46px] items-center">
                    {TOKEN_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setToken(opt.value)}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${token === opt.value ? opt.color + " shadow-lg" : "text-white/40"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Scale className="w-3 h-3" /> Late Fee (%)</label>
                  <input type="number" placeholder="5" title="Late fee percentage" value={lateFee} onChange={(e) => setLateFee(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Preview + Actions ─── */}
        <div className="xl:col-span-5">
          <div className="sticky top-32 space-y-6">
            <div className="glass-dark border border-white/10 p-1 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500/50" /><div className="w-2 h-2 rounded-full bg-yellow-500/50" /><div className="w-2 h-2 rounded-full bg-green-500/50" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Contract Preview</p>
              </div>

              <div className="bg-white p-6 h-[600px] overflow-y-auto text-black font-sans selection:bg-primary/20 space-y-6">
                {/* Title */}
                <div className="text-center space-y-1 pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">SERVICE AGREEMENT</h2>
                  <p className="text-[7px] text-gray-400">{contractId}</p>
                  <p className="text-[7px] text-gray-400">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>

                {/* Parties */}
                <div>
                  <p className="text-[8px] font-bold text-gray-900 mb-3">1. PARTIES</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[6px] font-bold text-gray-400 uppercase tracking-wider">Contractor</p>
                      <p className="text-[9px] font-bold text-gray-900">{contractorName || "—"}</p>
                      <p className="text-[7px] text-gray-400">{contractorAddress || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[6px] font-bold text-gray-400 uppercase tracking-wider">Client</p>
                      <p className="text-[9px] font-bold text-gray-900">{clientName || "—"}</p>
                      <p className="text-[7px] text-gray-400">{clientAddress || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Scope */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[8px] font-bold text-gray-900 mb-2">2. SCOPE OF WORK</p>
                  <p className="text-[9px] font-bold text-gray-800">{projectName || "Untitled Project"}</p>
                  <p className="text-[8px] text-gray-500 italic leading-relaxed mt-1">{scope || "General services as agreed."}</p>
                </div>

                {/* Compensation */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[8px] font-bold text-gray-900 mb-2">3. COMPENSATION</p>
                  <p className="text-[9px] text-gray-800">Total: <span className="font-bold text-[#00C853]">{amount || "0"} {token}</span></p>
                  {usdEquivalent && <p className="text-[7px] text-gray-400">~ ${usdEquivalent} USD</p>}
                  <p className="text-[8px] text-gray-500 mt-1">Due: {dueDate ? new Date(dueDate).toLocaleDateString() : "Upon completion"}</p>
                </div>

                {/* Provisions */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[8px] font-bold text-gray-900 mb-2">4. GENERAL PROVISIONS</p>
                  <div className="space-y-2">
                    {["4.1 Services & Goals", "4.2 Payment & Settlement", "4.3 Intellectual Property", "4.4 Termination", "4.5 Confidentiality", "4.6 Independent Contractor", "4.7 Limitation of Liability", "4.8 Dispute Resolution"].map((title, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-1 h-1 rounded-full bg-[#00C853] mt-1 flex-shrink-0" />
                        <p className="text-[7px] text-gray-500">{title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-6 border-t-2 border-gray-200">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="h-px bg-gray-900 mb-1" />
                      <p className="text-[7px] font-bold text-gray-900">Contractor</p>
                      <p className="text-[6px] text-gray-400">{contractorName || "—"}</p>
                      <p className="text-[6px] text-gray-300 mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <div className="h-px bg-gray-900 mb-1" />
                      <p className="text-[7px] font-bold text-gray-900">Client</p>
                      <p className="text-[6px] text-gray-400">{clientName || "—"}</p>
                      <p className="text-[6px] text-gray-300 mt-1">Date: ___________</p>
                    </div>
                  </div>
                </div>

                <p className="text-[5px] text-gray-300 text-center pt-4 border-t border-gray-100">Generated by Vertex — Vertex.vercel.app</p>
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
