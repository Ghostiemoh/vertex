"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building,
  FileText,
  LayoutGrid,
  Loader2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { WalletAuthButton } from "@/components/WalletAuthButton";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";

interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  created_at: string;
}

export default function ClientDirectory() {
  const { publicKey, connected } = useWallet();
  const { user, isAuthenticated } = useSession();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!supabase || !publicKey) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const ownerKey = user?.id || publicKey.toBase58();
      const ownerColumn = user ? "auth_user_id" : "user_address";
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq(ownerColumn, ownerKey)
        .order("name");

      if (data) setClients(data);
    } catch {
      toast("Failed to load clients. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, toast, user]);

  useEffect(() => {
    if (publicKey && isAuthenticated) {
      void fetchClients();
    }
  }, [fetchClients, isAuthenticated, publicKey]);

  const saveClient = async () => {
    if (!publicKey || !newName || !supabase || !isAuthenticated) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.from("clients").insert([
        {
          auth_user_id: user?.id,
          user_address: publicKey.toBase58(),
          name: newName,
          email: newEmail,
          address: newAddress,
        },
      ]);

      if (!error) {
        setIsAdding(false);
        setNewName("");
        setNewEmail("");
        setNewAddress("");
        await fetchClients();
        toast("Client added to your directory", "success");
      }
    } catch {
      toast("Failed to save client. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Are you sure? This will remove the client from your directory.")) {
      return;
    }

    try {
      await supabase.from("clients").delete().eq("id", id);
      await fetchClients();
      toast("Client removed", "info");
    } catch {
      toast("Failed to delete client.", "error");
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Client <span className="text-primary italic">Directory</span>
          </h1>
          <p className="text-muted-foreground italic">
            Keep your billing contacts in one place so invoices and agreement
            drafts are easier to reuse.
          </p>
        </div>
        <button
          onClick={() => {
            if (!connected) {
              toast("Connect your wallet first to add clients.", "info");
              return;
            }
            if (!isAuthenticated) {
              toast("Sign in with your wallet before saving clients.", "info");
              return;
            }
            setIsAdding(true);
          }}
          className="flex items-center gap-2 bg-primary text-white font-black px-6 py-4 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <UserPlus className="w-5 h-5" /> Add New Client
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
        />
      </div>

      {(!connected || !isAuthenticated) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/10"
        >
          <div className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-white/10">
            <Wallet className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-2xl font-black text-white mb-3">
            Connect and sign in to view clients
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
            Your client directory is tied to your signed-in wallet session so
            only you can manage saved business contacts.
          </p>
          <WalletAuthButton />
        </motion.div>
      )}

      {connected && isAuthenticated && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-dark border border-white/10 p-6 rounded-3xl group hover:border-primary/30 transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Building className="w-6 h-6" />
                  </div>
                  <button
                    title="Delete client"
                    onClick={() => deleteClient(client.id)}
                    className="p-2 text-white/5 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{client.name}</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground italic">
                    <Mail className="w-3.5 h-3.5" /> {client.email || "No email stored"}
                  </div>
                  <div className="flex items-start gap-3 text-xs text-muted-foreground italic">
                    <MapPin className="w-3.5 h-3.5 mt-0.5" />
                    <span className="line-clamp-2">
                      {client.address || "No address stored"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-2">
                  <Link
                    href={`/invoice?client=${encodeURIComponent(client.name)}`}
                    className="flex-grow py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-primary/20 hover:text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> Invoice
                  </Link>
                  <Link
                    href={`/contract?client=${encodeURIComponent(client.name)}`}
                    className="flex-grow py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-primary/20 hover:text-white transition-all text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <LayoutGrid className="w-3 h-3" /> Contract
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 grayscale opacity-20">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="font-bold tracking-widest uppercase text-xs">Loading...</p>
            </div>
          )}

          {!isLoading && filteredClients.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No clients found</h3>
              <p className="text-muted-foreground text-sm">
                Start building your directory by adding your first client.
              </p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-dark border border-white/10 w-full max-w-xl rounded-[40px] p-10 relative overflow-hidden"
            >
              <div className="relative z-10 space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-white italic tracking-tighter">
                    Add Client
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Save a billing contact for future invoices and agreement drafts.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Full legal name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Example: Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="billing@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Billing address
                    </label>
                    <textarea
                      rows={3}
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Street, city, country, tax code"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-grow py-4 bg-white/5 rounded-2xl text-white font-bold hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveClient}
                    disabled={isSaving || !newName}
                    className="flex-grow py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                    Save Client
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
