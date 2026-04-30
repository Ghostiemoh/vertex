"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { SolanaWallet } from "@supabase/auth-js";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";

interface SessionContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  walletAddress: string | null;
  signInWithWallet: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function ensureProfile(user: User | null, walletAddress: string | null) {
  if (!supabase || !user || !walletAddress) return;

  await supabase.from("profiles").upsert(
    {
      auth_user_id: user.id,
      address: walletAddress,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "auth_user_id",
    }
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const walletAddress = wallet.publicKey?.toBase58() || null;

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    const client = supabase;

    let active = true;

    const initSession = async () => {
      try {
        const {
          data: { session: nextSession },
        } = await client.auth.getSession();

        if (!active) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoading(false);
      } catch (error) {
        if (!active) return;

        console.warn("Session init failed", error);
        setIsLoading(false);
      }
    };

    void initSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !walletAddress) return;
    void ensureProfile(user, walletAddress);
  }, [user, walletAddress]);

  const signInWithWallet = useCallback(async () => {
    if (!supabase) {
      toast("Supabase is not configured yet.", "error");
      return;
    }

    const walletAdapter = wallet.wallet?.adapter;

    if (!wallet.connected || !walletAdapter) {
      toast("Connect your wallet before signing in.", "info");
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        wallet: walletAdapter as unknown as SolanaWallet,
        statement: "Sign in to Vertex to manage invoices, clients, payment links, and settlement history.",
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
      setUser(data.user);
      await ensureProfile(data.user, walletAddress);
      toast("Signed in with your wallet.", "success");
    } catch (error) {
      console.error("Wallet sign-in failed", error);
      const message =
        error instanceof Error ? error.message : "Wallet sign-in failed.";
      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [toast, wallet.connected, wallet.wallet, walletAddress]);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    toast("Signed out.", "info");
  }, [toast]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      session,
      isLoading,
      walletAddress,
      isAuthenticated: Boolean(session?.user),
      signInWithWallet,
      signOut,
    }),
    [isLoading, session, signInWithWallet, signOut, user, walletAddress]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
