export const PAYMENT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "payment_submitted",
  "payment_confirmed",
  "payment_finalized",
  "payment_failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentLifecycle {
  status: PaymentStatus;
  signature: string | null;
  confirmationStatus: "processed" | "confirmed" | "finalized" | null;
  confirmedAt: string | null;
  finalizedAt: string | null;
  failureReason: string | null;
}

export function mapLegacyInvoiceStatus(status: string | null | undefined): PaymentStatus {
  switch (status) {
    case "paid":
    case "payment_finalized":
      return "payment_finalized";
    case "payment_confirmed":
      return "payment_confirmed";
    case "payment_submitted":
      return "payment_submitted";
    case "payment_failed":
      return "payment_failed";
    case "viewed":
      return "viewed";
    case "sent":
      return "sent";
    default:
      return "draft";
  }
}

export function getStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "payment_submitted":
      return "Submitted";
    case "payment_confirmed":
      return "Confirmed";
    case "payment_finalized":
      return "Finalized";
    case "payment_failed":
      return "Failed";
    case "viewed":
      return "Viewed";
    case "sent":
      return "Sent";
    default:
      return "Draft";
  }
}
