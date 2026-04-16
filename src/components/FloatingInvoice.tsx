import { motion } from "framer-motion";
import { Shield, FileText } from "lucide-react";

export const FloatingInvoice = () => (
  <motion.div
    initial={{ opacity: 0, rotate: -5, y: 20 }}
    animate={{ opacity: 1, rotate: -2, y: 0 }}
    transition={{ duration: 1, delay: 0.5 }}
    className="absolute -top-12 -right-12 w-64 glass-dark p-6 rounded-3xl shadow-elite-hover hidden lg:block border border-primary/20"
  >
    <div className="flex justify-between items-start mb-6">
      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Invoice #LMNR-001</p>
        <p className="text-xs font-bold text-white">Status: <span className="text-primary italic">PAID</span></p>
      </div>
    </div>
    
    <div className="space-y-3 mb-6">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">Amount</span>
        <span className="text-white font-bold">12.50 SOL</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">Network</span>
        <span className="text-primary font-bold uppercase tracking-tighter">Solana Mainnet</span>
      </div>
    </div>

    <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2">
      <Shield className="w-3 h-3 text-primary" />
      <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Digitally Verified</span>
    </div>
  </motion.div>
);
