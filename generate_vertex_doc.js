const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageNumber, Footer, Header, BorderStyle, ShadingType, LevelFormat } = require('docx');
const fs = require('fs');

const doc = new Document({
    styles: {
        default: {
            document: {
                run: { font: "Arial", size: 22 }
            }
        },
        paragraphStyles: [
            {
                id: "Heading1",
                name: "Heading 1",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { size: 36, bold: true, color: "00C853", font: "Arial" },
                paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 }
            },
            {
                id: "Heading2",
                name: "Heading 2",
                basedOn: "Normal",
                next: "Normal",
                quickFormat: true,
                run: { size: 28, bold: true, color: "1E1E1E", font: "Arial" },
                paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 }
            }
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "VERTEX PAY | ", bold: true, color: "00C853" }),
                            new TextRun({ text: "Surgical Finality Deep Dive", italic: true })
                        ],
                        alignment: AlignmentType.RIGHT
                    })
                ]
            })
        },
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Building Finality: My Journey to Vertex | Page ", size: 18 }),
                            new TextRun({ children: [PageNumber.CURRENT], size: 18 })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ]
            })
        },
        children: [
            new Paragraph({
                text: "The Vertex Chronicles: Building Surgical Finality in the Global Economy",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [new TextRun({ text: "A Founder's Masterclass by Muhammad", italic: true, size: 24 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),

            new Paragraph({ text: "1. The Architect's Dilemma: The Friction of Global Talent", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("I’ve spent years operating as a data and on-chain analyst in the Solana ecosystem. On the chain, everything is fast. Transactions settle in 400ms. Markets move in the blink of an eye. But as a freelancer in Nigeria, my reality was the complete opposite."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun("The catalyst for change came with the announcement of "),
                    new TextRun({ text: "Colosseum", bold: true }),
                    new TextRun(" and the "),
                    new TextRun({ text: "Superteam Nigeria Frontier Side Quest", bold: true }),
                    new TextRun(". These weren't just competitions; they were the ultimate testing grounds. I didn't just want to build a product; I wanted to build a standard for the next generation of Nigerian builders operating on the global stage."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun("The contrast was agonizing. I could architect a multi-million dollar data pipeline by day, but by night, I was a victim of legacy banking. I dealt with 40% FX spreads, arbitrary bank limits, and the 'black hole' of 5-day international settlements. I was living in the future on-chain, but stuck in the 1970s financially."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "2. The Blueprint: Designing for Surgical Finality", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("When I started building Vertex, the design wasn't an afterthought—it was the mission. I rejected the generic, flat aesthetics of modern SaaS. If Vertex was going to be the 'Surgical Point of Finality,' it had to look like a cockpit."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The Emerald and the Void: ", bold: true }),
                    new TextRun("I chose Vertex Emerald (#00C853) against a Deep Void (#0A0A0A) background. It represents the spark of a successful transaction—the moment work turns into capital—in the vast, immutable ledger of the chain."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The 300ms Rule: ", bold: true }),
                    new TextRun("In my system, every interaction follows the speed of the SVM. No transition or animation exceeds 300ms. If the chain is fast, the UI must be faster. Every click feels like a snap, reinforcing the feeling of technical authority and precision."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "3. The Forge: Engineering the Infrastructure", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("Vertex isn't just a wrapper; it's a technical stack built for durability. I chose the Solana Virtual Machine (SVM) for its unique account architecture, which allows us to store complex 'Agreement' states on-chain for a fraction of the cost of Ethereum."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The Hybrid Model: ", bold: true }),
                    new TextRun("I integrated Supabase as our settlement backend to ensure surgical persistence. While Solana handles the 'Finality' of the payment, Supabase anchors the 'Business History.' This ensures that neither a client nor a freelancer can ever 'edit' the truth of a signed invoice after the fact."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun("Using agentic engineering with Antigravity, I was able to accelerate the development of our wallet-signature verification engine. This allows Vertex to prove, beyond any doubt, that a client authorized an agreement using their private key—bringing institutional legal weight to the freelance world."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "4. The Masterclass: The 3-Step Protocol", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("This is the exact workflow I built for myself, and now for you. It’s how I manage my high-ticket clients with absolute clarity."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "Step 1: The Immutable Service Agreement (ISA)", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun("Every project starts with a record of truth. We wallet-sign a JSON blob of the contract scope. This isn't a 'handshake'—it’s a cryptographic seal. If the scope changes, the signature breaks. This protects the freelancer from scope creep and the client from delivery failure."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "Step 2: Surgical Invoicing", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun("Vertex generates invoices that are more than just PDFs. They are 'Payment Intents.' Each invoice is tied to a specific project ID and contains the exact cryptographic requirements for settlement. It brings the prestige of a law firm to your digital billing."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "Step 3: Point-of-Sale Settlement", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({
                children: [
                    new TextRun("Settlement happens in SOL, USDC, or USDT. On Solana, this means the money is in your wallet in less than a second for pennies. For a Nigerian professional, this is the ultimate weapon against inflation and capital controls. Work is done. Payment is final. No middleman. No 'pending' status."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "5. The Mission: The On-Chain Nigerian Institution", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("I built Vertex specifically for the "),
                    new TextRun({ text: "Colosseum", bold: true }),
                    new TextRun(" and the "),
                    new TextRun({ text: "Superteam Nigeria Frontier Side Quest", bold: true }),
                    new TextRun(" to prove that world-class infrastructure can be forged in our local ecosystem. For too long, the 'Nigerian Developer' has faced a trust barrier in the global market. Vertex dissolves that barrier by providing institutional-grade transparency."),
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun("My goal is to onboard a cohort of 10 'High-Ticket' peers who will use Vertex to operate not as 'gig workers,' but as 'On-Chain Institutions.' We are moving away from local limitations and into a global standard of technical excellence, fueled by the competitive spirit of the Solana community."),
                ],
                spacing: { after: 200 }
            }),

            new Paragraph({ text: "6. Accessing Finality: Your First Step", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
                children: [
                    new TextRun("The terminal is live at "),
                    new TextRun({ text: "vertex-pay.vercel.app", bold: true, color: "00C853" }),
                    new TextRun(". Connect your Phantom or Solflare wallet, initiate your first Agreement, and experience the surgical precision of the Solana freelance economy."),
                ],
                spacing: { after: 400 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Absolute Precision. Infinite Agency. Surgical Finality.", bold: true, italic: true, color: "00C853" }),
                ],
                alignment: AlignmentType.CENTER
            }),
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Vertex_The_Surgical_Deep_Dive.docx", buffer);
});
