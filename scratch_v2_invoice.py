import os

file_path = 'src/app/invoice/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update InvoiceItem interface
content = content.replace('  qty: number;\\n  rate: number;\\n}', '  qty: number;\\n  rate: number;\\n  period: string;\\n}')

# 2. Add vendorPhone state
content = content.replace('  const [vendorAddress, setVendorAddress] = useState("");', '  const [vendorAddress, setVendorAddress] = useState("");\\n  const [vendorPhone, setVendorPhone] = useState("");')

# 3. Update addItem
content = content.replace("Math.random().toString(36).slice(2), description: \\\"\\\", qty: 1, rate: 0 }", "Math.random().toString(36).slice(2), description: \\\"\\\", qty: 1, rate: 0, period: \\\"\\\" }")

# 4. Update initial state
content = content.replace("useState<InvoiceItem[]>([{ id: \\\"1\\\", description: \\\"\\\", qty: 1, rate: 0 }])", "useState<InvoiceItem[]>([{ id: \\\"1\\\", description: \\\"\\\", qty: 1, rate: 0, period: \\\"\\\" }])")

# 5. Update buildPdfDoc (PDF Generation)
pdf_start = '    let cursorY = 25;'
pdf_end = '    /* ── Payment Terms ── */'

new_pdf_gen = '''    let cursorY = 25;

    /* ── Header (Contractor Info) ── */
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text(vendorName || "[Name / Organization]", margin, cursorY);
    
    cursorY += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    if (vendorAddress) {
      const vendorAddrLines = doc.splitTextToSize(vendorAddress, contentWidth);
      doc.text(vendorAddrLines, margin, cursorY);
      cursorY += vendorAddrLines.length * 5;
    }
    if (vendorPhone) {
      doc.text(vendorPhone, margin, cursorY);
      cursorY += 5;
    }
    if (vendorEmail) {
      doc.text(vendorEmail, margin, cursorY);
      cursorY += 5;
    }

    cursorY += 10;

    /* ── Invoice Title & Dates ── */
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text("INVOICE", pageWidth - margin, cursorY, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Number: ${invoiceNumber}`, pageWidth - margin, cursorY + 8, { align: "right" });
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, cursorY + 13, { align: "right" });
    if (dueDate) {
      doc.text(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, pageWidth - margin, cursorY + 18, { align: "right" });
    }

    /* ── From / To ── */
    const infoY = cursorY + 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("From:", margin, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(vendorName || "[Your Name / Org]", margin, infoY + 5);
    
    const toY = infoY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("To:", margin, toY);
    doc.setFont("helvetica", "normal");
    doc.text(clientName || "[Client Name / Org]", margin, toY + 5);
    if (clientAddress) {
      const clientAddrLines = doc.splitTextToSize(clientAddress, 80);
      doc.text(clientAddrLines, margin, toY + 10);
    }

    cursorY = toY + 25;

    /* ── Line Items Table ── */
    autoTable(doc, {
      startY: cursorY,
      head: [["Description", "Period", "Amount"]],
      body: items.map(item => [
        item.description || "Service",
        item.period || "—",
        `${(item.qty * item.rate).toFixed(2)} ${token}`,
      ]),
      theme: "plain",
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: darkText,
        fontStyle: "bold",
        fontSize: 10,
        cellPadding: 6,
      },
      bodyStyles: {
        textColor: darkText,
        fontSize: 10,
        cellPadding: 6,
      },
      margin: { left: margin, right: margin },
      tableLineWidth: 0,
      tableLineColor: lightGray,
    });

    const tableEndY = doc.lastAutoTable.finalY;
    cursorY = tableEndY + 10;

    /* ── Totals ── */
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 140, cursorY);
    doc.text(`${total.toFixed(2)} ${token}`, pageWidth - margin, cursorY, { align: "right" });
    
    cursorY += 20;

    /* ── Crypto Payment Details ── */
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Crypto Payment Details:", margin, cursorY);
    
    cursorY += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Accepted Networks: Solana (SOL)", margin, cursorY);
    cursorY += 5;
    doc.text(`Preferred Token: ${token}`, margin, cursorY);
    cursorY += 5;
    doc.text(`Wallet Address: ${effectiveWallet}`, margin, cursorY);

    cursorY += 15;
'''

start_idx = content.find(pdf_start)
end_idx = content.find(pdf_end)
if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_pdf_gen + content[end_idx:]

# 6. Update Form UI (Vendor Phone)
ui_vendor_start = '<input type="email" placeholder="your@email.com" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:opacity-30" />'
ui_vendor_phone = ui_vendor_start + '\\n                  <input type="text" placeholder="Your Phone Number" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:opacity-30" />'
content = content.replace(ui_vendor_start, ui_vendor_phone)

# 7. Update Item Row UI (Period)
content = content.replace('grid-cols-[1fr_80px_100px_36px]', 'grid-cols-[1fr_100px_60px_100px_36px]')
content = content.replace('<span>Description</span>\\n                <span className="text-center">Qty</span>\\n                <span className="text-right">Rate ({token})</span>', '<span>Description</span>\\n                <span>Period</span>\\n                <span className="text-center">Qty</span>\\n                <span className="text-right">Rate ({token})</span>')

item_row_old = '<input type="text" placeholder="e.g. Smart Contract Audit" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.08] transition-all outline-none" />'
item_row_new = item_row_old + '\\n                    <input type="text" placeholder="Jan 1 - Jan 7" value={item.period} onChange={(e) => updateItem(item.id, "period", e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none" />'
content = content.replace(item_row_old, item_row_new)

# 8. Update Preview UI (Name/Phone/Period)
preview_header_start = '<h2 className="text-xl font-bold tracking-tight text-gray-900 uppercase">{vendorName || "MUHAMMAD AUWAL ABDULAZIZ"}</h2>'
preview_header_new = '<h2 className="text-xl font-bold tracking-tight text-gray-900 uppercase">{vendorName || "[Name / Organization]"}</h2>\\n                  <p className="text-[10px] text-gray-500">{vendorPhone}</p>'
content = content.replace(preview_header_start, preview_header_new)

content = content.replace('{vendorName || "MUHAMMAD AUWAL ABDULAZIZ"}', '{vendorName || "[Your Name / Org]"}')
content = content.replace('{clientName || "Client Name"}', '{clientName || "[Client Name / Org]"}')

preview_item_old = '<span className="text-gray-800">{item.description || "Service"}</span>\\n                        <span className="text-gray-600">{new Date().toLocaleDateString()}</span>'
preview_item_new = '<span className="text-gray-800">{item.description || "Service"}</span>\\n                        <span className="text-gray-600">{item.period || "—"}</span>'
content = content.replace(preview_item_old, preview_item_new)
content = content.replace('grid-cols-[1fr_80px_80px]', 'grid-cols-[1fr_100px_80px]')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
