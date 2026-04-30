"use client";

import { useSyncExternalStore } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/SessionProvider";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

export function WalletAuthButton() {
  const mounted = useIsMounted();
  const wallet = useWallet();
  const { isAuthenticated, isLoading, signInWithWallet, signOut, walletAddress } =
    useSession();

  if (!mounted) {
    return null;
  }

  if (!wallet.connected) {
    return <WalletMultiButton />;
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={signInWithWallet}
        disabled={isLoading}
        className="vertex-btn"
        title="Sign in with wallet"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShieldCheck className="w-4 h-4" />
        )}
        Sign In
      </button>
    );
  }

  return (
    <button onClick={signOut} className="vertex-btn-outline" title="Sign out">
      <LogOut className="w-4 h-4" />
      {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "Sign Out"}
    </button>
  );
}
