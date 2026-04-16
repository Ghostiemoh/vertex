async function generateLetterhead() {
  const docx = await import("docx");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    ImageRun,
    Packer,
    PageNumber,
    Paragraph,
    TabStopType,
    TextRun,
  } = docx;

  const PRIMARY_COLOR = "00C853";
  const SECONDARY_COLOR = "666666";
  const TEXT_COLOR = "0B0F0C";
  const LOGO_PATH =
    "C:\\Users\\Muhammad\\.gemini\\antigravity\\brain\\ecb51ea2-e64a-483e-8ed2-d89558111d53\\solkit_logo_premium_1776014139974.png";
  const OUTPUT_PATH = path.join(__dirname, "..", "SolKit_Letterhead.docx");

  console.log("Generating SolKit Letterhead...");

  const logoData = fs.readFileSync(LOGO_PATH);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
            color: TEXT_COLOR,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 12240,
              height: 15840,
            },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new ImageRun({
                    data: logoData,
                    transformation: {
                      width: 60,
                      height: 60,
                    },
                    type: "png",
                    altText: {
                      title: "SolKit Logo",
                      description: "Premium SolKit Brand Icon",
                      name: "solkit_logo",
                    },
                  }),
                  new TextRun({ text: "\t" }),
                  new TextRun({
                    text: "SolKit",
                    bold: true,
                    size: 36,
                    color: PRIMARY_COLOR,
                  }),
                ],
                tabStops: [
                  {
                    type: TabStopType.LEFT,
                    position: 1000,
                  },
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "The Web3 Payments Toolkit",
                    italics: true,
                    size: 18,
                    color: SECONDARY_COLOR,
                  }),
                ],
                spacing: {
                  after: 200,
                },
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: PRIMARY_COLOR,
                    space: 1,
                  },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                    space: 1,
                  },
                },
                spacing: {
                  before: 200,
                },
                children: [
                  new TextRun({
                    text: "SolKit | Lagos, Nigeria | contact@solkit.payments",
                    size: 16,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "www.solkit.io | Professional Toolkit for African Freelancers",
                    size: 14,
                    color: SECONDARY_COLOR,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun("Page "),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({ text: "Date: ", bold: true }),
              new TextRun(
                new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun({ text: "To:", bold: true })],
          }),
          new Paragraph({ children: [new TextRun("[Recipient Name]")] }),
          new Paragraph({ children: [new TextRun("[Recipient Organization]")] }),
          new Paragraph({
            spacing: { before: 800 },
            children: [new TextRun({ text: "Subject: [Letter Subject]", bold: true })],
          }),
          new Paragraph({
            spacing: { before: 400 },
            children: [new TextRun("Dear [Recipient Name],")],
          }),
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun(
                "Type your letter content here. SolKit is committed to providing premium Web3 payment tools for the modern African freelancer. This letterhead is designed to represent that standard of excellence."
              ),
            ],
          }),
          new Paragraph({
            spacing: { before: 1200 },
            children: [new TextRun("Sincerely,")],
          }),
          new Paragraph({
            spacing: { before: 800 },
            children: [new TextRun({ text: "[Your Name]", bold: true })],
          }),
          new Paragraph({
            children: [new TextRun("Founder, SolKit")],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`Document saved to ${OUTPUT_PATH}`);
}

generateLetterhead().catch(console.error);
