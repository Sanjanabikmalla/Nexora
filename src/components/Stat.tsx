import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Stat({
  label,
  value,
  sub,
  icon,
  color = "violet",
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  color?: "violet" | "cyan" | "pink" | "mint";
  delay?: number;
}) {
  const colorMap = {
    violet: "oklch(0.68 0.24 295)",
    cyan: "oklch(0.82 0.17 210)",
    pink: "oklch(0.72 0.25 350)",
    mint: "oklch(0.78 0.19 165)",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative p-5 rounded-2xl glass overflow-hidden group"
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl group-hover:opacity-50 transition-opacity"
        style={{ background: colorMap[color] }}
      />
      <div className="flex items-start justify-between relative">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon && <div className="text-white/40">{icon}</div>}
      </div>
      <div className="text-3xl font-bold tracking-tight mt-2 relative" style={{ fontFamily: "Space Grotesk" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1 relative">{sub}</div>}
    </motion.div>
  );
}