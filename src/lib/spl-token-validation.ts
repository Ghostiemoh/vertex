import type {
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";

export function hasParsedInstruction(
  instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction {
  return "parsed" in instruction;
}

// Validate an SPL-token instruction matches an expected mint + destination + min amount.
// Requires `transferChecked` (or any parsed shape that includes `info.mint`).
// Plain `transfer` is rejected because it omits the mint, which would allow a
// foreign SPL token sent to the correct ATA to pass verification.
export function matchesSplTokenTransfer(
  instruction: ParsedInstruction | PartiallyDecodedInstruction,
  expectations: { expectedMint: string; expectedDestination: string; minAmount: number }
): boolean {
  if (!hasParsedInstruction(instruction)) return false;
  if (instruction.program !== "spl-token") return false;

  const info = instruction.parsed?.info;
  if (!info) return false;

  if (typeof info.mint !== "string" || info.mint !== expectations.expectedMint) return false;
  if (info.destination !== expectations.expectedDestination) return false;

  const rawAmount = info.tokenAmount?.amount ?? info.amount;
  if (rawAmount === undefined || rawAmount === null) return false;
  return Number(rawAmount) >= expectations.minAmount;
}
