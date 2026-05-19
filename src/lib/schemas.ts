import { z } from "zod";

// Shared input shapes for Vertex API routes. Use `safeParse` at the route boundary.
// Keep schemas narrow — match the actual request payload, not a wishlist.

export const sendInvoiceSchema = z.object({
  clientEmail: z.string().email("Recipient email is invalid."),
  pdfBase64: z.string().min(1, "Invoice PDF payload is missing."),
  invoiceNumber: z.string().min(1).max(100),
  vendorName: z.string().min(1).max(200),
  clientName: z.string().min(1).max(200),
  total: z.coerce.number().nonnegative("Total must be a non-negative number."),
  token: z.string().min(1).max(10),
  paymentLink: z
    .string()
    .url("Payment link must be a valid URL.")
    .refine((v) => /^https?:\/\//i.test(v), {
      message: "Payment link must use http or https.",
    }),
  notes: z
    .string()
    .max(2000)
    .nullish()
    .transform((v) => v ?? undefined),
});

export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;

export const paymentVerifyPostSchema = z.object({
  signature: z
    .string()
    .regex(
      /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,
      "Invalid transaction signature format."
    ),
});

export type PaymentVerifyPostInput = z.infer<typeof paymentVerifyPostSchema>;
