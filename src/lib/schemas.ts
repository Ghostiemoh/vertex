import { z } from "zod";

// Shared input shapes for Vertex API routes. Use `safeParse` at the route boundary.
// Keep schemas narrow — match the actual request payload, not a wishlist.

export const paymentVerifyPostSchema = z.object({
  signature: z
    .string()
    .regex(
      /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,
      "Invalid transaction signature format."
    ),
});

export type PaymentVerifyPostInput = z.infer<typeof paymentVerifyPostSchema>;

// Solana Actions / Blink POST payload: payer pubkey only.
export const blinkActionPostSchema = z.object({
  account: z
    .string()
    .regex(
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      "Account must be a valid Solana public key."
    ),
});

export type BlinkActionPostInput = z.infer<typeof blinkActionPostSchema>;
