import { describe, expect, it } from "vitest";
import {
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { matchesSplTokenTransfer } from "@/lib/spl-token-validation";

const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const FOREIGN_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const RECIPIENT_ATA = "9PoUcgLMRJfBzPaqUyk1HUYgT4kRPcAMnX5RYqdGAd2A";

function buildTransferChecked(opts: {
  mint: string;
  destination: string;
  amount: string;
  withTokenAmount?: boolean;
}): ParsedInstruction {
  const info: Record<string, unknown> = {
    mint: opts.mint,
    destination: opts.destination,
    source: "SOMEsourceATAaddress",
    authority: "SOMEauthorityaddress",
  };
  if (opts.withTokenAmount) {
    info.tokenAmount = { amount: opts.amount, decimals: 6, uiAmount: 1 };
  } else {
    info.amount = opts.amount;
  }

  return {
    program: "spl-token",
    programId: { equals: () => false } as never,
    parsed: { type: "transferChecked", info },
  } as unknown as ParsedInstruction;
}

function buildPartiallyDecoded(): PartiallyDecodedInstruction {
  return {
    programId: { equals: () => false } as never,
    accounts: [],
    data: "",
  } as unknown as PartiallyDecodedInstruction;
}

describe("matchesSplTokenTransfer — mint validation", () => {
  const expectations = {
    expectedMint: USDC_DEVNET,
    expectedDestination: RECIPIENT_ATA,
    minAmount: 1_000_000,
  };

  it("accepts a transferChecked with the right mint, destination, and amount", () => {
    const ix = buildTransferChecked({
      mint: USDC_DEVNET,
      destination: RECIPIENT_ATA,
      amount: "1500000",
      withTokenAmount: true,
    });
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(true);
  });

  it("REJECTS a foreign mint sent to the correct ATA (the security hole)", () => {
    const ix = buildTransferChecked({
      mint: FOREIGN_MINT,
      destination: RECIPIENT_ATA,
      amount: "999999999",
      withTokenAmount: true,
    });
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(false);
  });

  it("rejects when destination ATA is wrong", () => {
    const ix = buildTransferChecked({
      mint: USDC_DEVNET,
      destination: "WrongDestinationATAaddress11111111111111111",
      amount: "1500000",
      withTokenAmount: true,
    });
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(false);
  });

  it("rejects when amount is below the required minimum", () => {
    const ix = buildTransferChecked({
      mint: USDC_DEVNET,
      destination: RECIPIENT_ATA,
      amount: "1",
      withTokenAmount: true,
    });
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(false);
  });

  it("rejects a plain 'amount' shape with no mint field (legacy transfer)", () => {
    const ix = {
      program: "spl-token",
      programId: { equals: () => false } as never,
      parsed: {
        type: "transfer",
        info: {
          destination: RECIPIENT_ATA,
          amount: "1500000",
          authority: "auth",
          source: "src",
        },
      },
    } as unknown as ParsedInstruction;
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(false);
  });

  it("rejects PartiallyDecodedInstruction (no parsed field)", () => {
    expect(matchesSplTokenTransfer(buildPartiallyDecoded(), expectations)).toBe(false);
  });

  it("rejects non-spl-token programs", () => {
    const ix = {
      program: "system",
      programId: { equals: () => false } as never,
      parsed: {
        type: "transfer",
        info: {
          mint: USDC_DEVNET,
          destination: RECIPIENT_ATA,
          amount: "1500000",
        },
      },
    } as unknown as ParsedInstruction;
    expect(matchesSplTokenTransfer(ix, expectations)).toBe(false);
  });
});
