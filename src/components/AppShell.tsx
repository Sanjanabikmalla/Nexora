import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Compass, LayoutDashboard, Sparkles, LogOut, Bot, Headphones, ListChecks, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { to: "/discover", label: "Lead Discovery", icon: Compass },
  { to: "/lists", label: "My Lists", icon: ListChecks },
  { to: "/copilot", label: "Co-Pilot", icon: Headphones },
  { to: "/agent", label: "AI Sales Agent", icon: Bot },
  { to: "/admin", label: "Admin", icon: Shield },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-white/5 p-5 flex flex-col gap-2 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg aurora-bg glow-violet flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold tracking-tight">NEXORA</div>
            <div className="text-[10px] text-muted-foreground tracking-widest">AI · HYDERABAD</div>
          </div>
        </Link>
        {NAV.map((n) => {
          const active = pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                active ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "linear-gradient(120deg, oklch(0.68 0.24 295 / 0.25), oklch(0.82 0.17 210 / 0.15))", border: "1px solid oklch(1 0 0 / 0.08)" }}
                />
              )}
              <Icon className="w-4 h-4 relative" />
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
        <div className="mt-auto">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.navigate({ to: "/" });
            }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white px-3 py-2 w-full"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
