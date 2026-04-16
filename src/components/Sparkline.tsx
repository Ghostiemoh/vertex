import { motion } from "framer-motion";

export const Sparkline = ({ color }: { color: string }) => (
  <svg className="absolute bottom-0 left-0 w-full h-12 opacity-20 pointer-events-none" viewBox="0 0 100 20">
    <motion.path
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 2, ease: "easeInOut" }}
      d="M0 15 Q 10 5, 20 18 T 40 10 T 60 15 T 80 5 T 100 12"
      fill="none"
      stroke={color}
      strokeWidth="0.5"
    />
  </svg>
);
