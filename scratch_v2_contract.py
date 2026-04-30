import os

file_path = 'src/app/contract/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Deliverable interface
interface_deliv = '''interface Deliverable {
  id: string;
  name: string;
  description: string;
  type: "One-Time" | "Recurring";
  fees: string;
}

export default function ContractPage() {'''
content = content.replace('export default function ContractPage() {', interface_deliv)

# 2. Add deliverables and contractDate state
# Replacing existing states to make room
content = content.replace('  const [projectName, setProjectName] = useState("");', '  const [contractDate, setContractDate] = useState("");')
content = content.replace('  const [scope, setScope] = useState("");', '  const [deliverables, setDeliverables] = useState<Deliverable[]>([{ id: "1", name: "", description: "", type: "One-Time", fees: "" }]);')

# 3. Deliverable management functions
funcs = '''  const addDeliverable = () => {
    setDeliverables([...deliverables, { id: Math.random().toString(36).slice(2), name: "", description: "", type: "One-Time", fees: "" }]);
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
'''
content = content.replace('  const effectiveWallet = connected ? publicKey?.toBase58() : manualWallet;', funcs + '\n  const effectiveWallet = connected ? publicKey?.toBase58() : manualWallet;')

# 4. Update usdEquivalent to use totalAmount
content = content.replace('  const numAmount = parseFloat(amount) || 0;', '  const numAmount = totalAmount;')

# 5. Update generatePDF (PDF Generation)
pdf_gen_old_start = '      /* ── Title ── */'
pdf_gen_old_end = '      /* ── Final Page: Annexure A ── */'

new_pdf_gen = '''      /* ── Title ── */
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text("FREELANCER SERVICES AGREEMENT", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 15;
      
      /* ── Intro ── */
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkText);
      const intro = `This Agreement is made on ${contractDate || new Date().toLocaleDateString()} between:`;
      doc.text(intro, margin, cursorY);
      
      cursorY += 8;
      doc.setFont("helvetica", "bold");
      doc.text(`CLIENT: ${clientName || "[Client Name / Org]"}`, margin, cursorY);
      doc.setFont("helvetica", "normal");
      if (clientAddress) {
        const clientLines = doc.splitTextToSize(clientAddress, contentWidth);
        doc.text(clientLines, margin, cursorY + 5);
        cursorY += clientLines.length * 5 + 5;
      } else {
        cursorY += 8;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`FREELANCER: ${contractorName || "[Your Name / Org]"}`, margin, cursorY);
      doc.setFont("helvetica", "normal");
      if (contractorAddress) {
        const contractorLines = doc.splitTextToSize(contractorAddress, contentWidth);
        doc.text(contractorLines, margin, cursorY + 5);
        cursorY += contractorLines.length * 5 + 5;
      } else {
        cursorY += 8;
      }

      cursorY += 5;
      const summary = `The Freelancer shall provide services to the Client as specified in Annexure A (the "Services").`;
      const summaryLines = doc.splitTextToSize(summary, contentWidth);
      doc.text(summaryLines, margin, cursorY);
      cursorY += summaryLines.length * 5 + 10;

      /* ── Provisions ── */
      const sections = [
        { t: "1. Term", c: "This Agreement begins on the date of execution and continues until completion of the Services." },
        { t: "2. Services", c: "The Freelancer will perform the services professionally and on time, as detailed in Annexure A." },
        { t: "3. Fees & Payment", c: `In consideration for the Services, Client shall pay Freelancer a total of ${totalAmount} ${token}. Payment will be settled via the Solana blockchain to the specified wallet address. All payments are non-refundable upon deliverable acceptance.` },
        { t: "4. Intellectual Property", c: "Upon full payment, all work product created under this Agreement shall be owned by the Client." },
        { t: "5. Confidentiality", c: "Both parties agree to keep all sensitive project information confidential." },
        { t: "6. Limitation of Liability", c: "Freelancer's liability is limited to the total amount of fees paid under this Agreement." },
        { t: "7. Termination", c: "Either party may terminate this Agreement with 7 days' written notice." },
        { t: "8. Governing Law", c: "This Agreement shall be governed by the laws applicable in the Freelancer's primary jurisdiction." },
        { t: "9. Signatures", c: "Both parties agree to the terms herein through digital execution or by the transfer of initial payment." }
      ];

      sections.forEach(s => {
        if (cursorY > 260) { doc.addPage(); cursorY = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(s.t, margin, cursorY);
        cursorY += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(s.c, contentWidth);
        doc.text(lines, margin, cursorY);
        cursorY += lines.length * 5 + 8;
      });

      /* ── Signature Section ── */
      cursorY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.text(`Payment Destination: ${effectiveWallet}`, margin, cursorY);
      cursorY += 4;
      doc.text(`Digital Fingerprint: ${signatureBase58 || "Unverified Digital Agreement"}`, margin, cursorY);
      
      /* ── Final Page: Annexure A ── */
'''

start_idx = content.find(pdf_gen_old_start)
end_idx = content.find(pdf_gen_old_end)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_pdf_gen + content[end_idx:]

# 6. Update Annexure A table logic in generatePDF
annex_old = '''      autoTable(doc, {
        startY: cursorY + 15,
        head: [["Project / Deliverable", "Scope of Work", "Total Fee"]],
        body: [[projectName || "—", scope || "—", `${amount} ${token}`]],'''
annex_new = '''      autoTable(doc, {
        startY: cursorY + 15,
        head: [["Deliverable Name", "Description", "Type", "Fees"]],
        body: deliverables.map(d => [d.name || "—", d.description || "—", d.type, `${d.fees} ${token}`]),'''
content = content.replace(annex_old, annex_new)

# 7. Update Form UI
ui_date_start = '<Building className="w-4 h-4 text-primary" /> Contractor'
ui_date_input = '<Calendar className="w-4 h-4 text-primary" /> Contract Date</h3>\\n                <input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none mb-6" />\\n                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building'
# Using Building as a marker
content = content.replace('<Building className="w-4 h-4 text-primary" /> Contractor', '<Building className="w-4 h-4 text-primary" /> Full Name / Organization')
content = content.replace('<User className="w-4 h-4 text-primary" /> Client', '<User className="w-4 h-4 text-primary" /> Client Name / Organization')

# Replace Deliverables section
deliv_ui_old_start = '{/* Project Details */}'
deliv_ui_old_end = '{/* Financials */}'

deliv_ui_new = '''            {/* Deliverables & Scope */}
            <div className="space-y-6 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Briefcase className="w-3 h-3" /> Deliverables & Scope</label>
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  {TOKEN_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setToken(opt.value)} className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${token === opt.value ? opt.color : "text-white/40 hover:text-white/60"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {deliverables.map((d, idx) => (
                  <div key={d.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                    <div className="grid grid-cols-[1fr_120px_36px] gap-3">
                      <input type="text" placeholder="Deliverable Name (e.g. Logo Design)" value={d.name} onChange={(e) => updateDeliverable(d.id, "name", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none" />
                      <select value={d.type} onChange={(e) => updateDeliverable(d.id, "type", e.target.value as any)} className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-xs outline-none cursor-pointer">
                        <option value="One-Time" className="bg-[#0f1115]">One-Time</option>
                        <option value="Recurring" className="bg-[#0f1115]">Recurring</option>
                      </select>
                      <button onClick={() => removeDeliverable(d.id)} className="p-2 text-white/10 hover:text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea placeholder="Description / Scope details" rows={2} value={d.description} onChange={(e) => updateDeliverable(d.id, "description", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none resize-none" />
                    <div className="relative">
                      <input type="number" placeholder="Fees" value={d.fees} onChange={(e) => updateDeliverable(d.id, "fees", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40">{token}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addDeliverable} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-muted-foreground hover:border-primary/50 flex items-center justify-center gap-2 font-bold text-sm bg-white/[0.01] cursor-pointer">
                <Plus className="w-4 h-4" /> Add Deliverable
              </button>
            </div>
'''

# Wait, I need to find the correct slice for UI replacement
# I'll use a simpler approach for UI replacement in the next turn if this fails.
# Actually, I'll just replace the whole form area.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
"
