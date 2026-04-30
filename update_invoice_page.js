const fs = require('fs');
let content = fs.readFileSync('src/app/invoice/page.tsx', 'utf8');

// 1. Add import
content = content.replace(
  /import { encodePaymentRequest, type PaymentToken } from "@\/lib\/payment-utils";/,
  `import { encodePaymentRequest, type PaymentToken } from "@/lib/payment-utils";\nimport { VERTEX_NETWORK } from "@/lib/config";`
);

// 2. Replace network
content = content.replace(
  /network: process\.env\.NEXT_PUBLIC_SOLANA_NETWORK \|\| "devnet",/g,
  `network: VERTEX_NETWORK,`
);

// 3. Add yields in buildPdfDoc
// Just a few yields to keep the event loop unblocked.
content = content.replace(
  /const qrDataUrl = await QRCode\.toDataURL\(paymentLink, \{ margin: 1, width: 300 \}\);/,
  `const qrDataUrl = await QRCode.toDataURL(paymentLink, { margin: 1, width: 300 });\n    await new Promise(r => setTimeout(r, 0));`
);

content = content.replace(
  /    \/\* ── ITEMS TABLE ── \*\//,
  `    await new Promise(r => setTimeout(r, 0));\n    /* ── ITEMS TABLE ── */`
);

content = content.replace(
  /    \/\/ Footer\r?\n    const totalPages = doc\.internal\.getNumberOfPages\(\);/,
  `    await new Promise(r => setTimeout(r, 0));\n    // Footer\n    const totalPages = doc.internal.getNumberOfPages();`
);

content = content.replace(
  /    \/\/ Persist to database\r?\n    try \{/,
  `    await new Promise(r => setTimeout(r, 0));\n    // Persist to database\n    try {`
);

fs.writeFileSync('src/app/invoice/page.tsx', content);
