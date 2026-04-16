import { encodePaymentRequest, decodePaymentRequest } from "./src/lib/payment-utils";

const testPayload = {
  recipient: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  amount: 1.5,
  token: "SOL" as const,
  description: "Test Payment",
};

try {
  console.log("Encoding test payload...");
  const encoded = encodePaymentRequest(testPayload);
  console.log("Encoded (base64url safe):", encoded);

  if (encoded.includes("+") || encoded.includes("/") || encoded.includes("=")) {
    console.error("FAIL: Encoded string contains non-base64url characters!");
  } else {
    console.log("SUCCESS: Encoded string is base64url safe.");
  }

  console.log("Decoding test string...");
  const decoded = decodePaymentRequest(encoded);
  
  if (decoded && decoded.amount === testPayload.amount && decoded.recipient === testPayload.recipient) {
    console.log("SUCCESS: Decoded payload matches original.");
  } else {
    console.error("FAIL: Decoded payload mismatch!", decoded);
  }
} catch (error) {
  console.error("Test Error:", error);
}
