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
import { useWallet } from "@solana/wallet-adapter-react";
import type { SolanaWallet } from "@supabase/auth-js";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import nacl from "tweetnacl";

const STORAGE_KEY = "Vertex-session";

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
      onConflict: "address",
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
  const supabaseWallet = useMemo<SolanaWallet | undefined>(() => {
    if (!wallet.publicKey || !wallet.signMessage) return undefined;

    return {
      publicKey: wallet.publicKey,
      signMessage: wallet.signMessage,
    };
  }, [wallet.publicKey, wallet.signMessage]);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const initSession = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        
        // Check for local session first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const localSession = JSON.parse(stored) as Session;
          setSession(localSession);
          setUser(localSession.user);
          setIsLoading(false);
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setIsLoading(false);
        if (data.session?.user && walletAddress) {
          await ensureProfile(data.session.user, walletAddress);
        }
      } catch (err) {
        if (active) {
          console.warn("Session init delayed:", err instanceof Error ? err.message : "Network error");
          setIsLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      // Don't overwrite local session with null if we have one
      if (!nextSession && localStorage.getItem(STORAGE_KEY)) return;
      
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [walletAddress]);

  const signInWithWallet = useCallback(async () => {
    if (!supabase) {
      toast("Supabase is not configured yet.", "error");
      return;
    }

    if (!wallet.connected) {
      toast("Connect your wallet before signing in.", "info");
      return;
    }

    if (!supabaseWallet) {
      toast("This wallet does not support message signing.", "error");
      return;
    }

    try {
      setIsLoading(true);
      
      const statement = "Sign in to Vertex to manage invoices, clients, and payment history.";
      const message = new TextEncoder().encode(statement);
      const signature = await wallet.signMessage!(message);
      
      // Verify signature locally using tweetnacl
      const verified = nacl.sign.detached.verify(
        message,
        signature,
        wallet.publicKey!.toBytes()
      );

      if (!verified) throw new Error("Signature verification failed.");

      // Create a persistent mock session since the Web3 provider is disabled on the backend
      // This allows the app to function with its current "Public Access" RLS policies.
      const mockUser: User = {
        id: walletAddress!, // Use wallet address as uniquely identifying ID
        aud: "authenticated",
        role: "authenticated",
        email: "",
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: "solana" },
        user_metadata: { address: walletAddress },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: "mock-token",
        refresh_token: "mock-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      setSession(mockSession);
      setUser(mockUser);
      
      // Persist to localStorage to survive refreshes
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
      
      await ensureProfile(mockUser, walletAddress);
      toast("Signed in with your wallet.", "success");
    } catch (error) {
      console.error("Auth Exception:", error);
      let message = "Wallet sign-in failed.";

      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          message = "Network error: Could not reach Supabase. Ensure your project is active.";
        } else {
          message = error.message;
        }
      }
      
      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [supabaseWallet, toast, wallet.connected, walletAddress]);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
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
