import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Headphones, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/copilot")({
  component: CopilotIndex,
});

function CopilotIndex() {
  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-3xl space-y-5">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Cold Call Co-Pilot</div>
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>Pick a lead to prepare your next call</h1>
        <p className="text-muted-foreground">Open a business detail page and use Prepare to Call for a briefing, owner roleplay, and readiness report.</p>
        <Link to="/discover" className="btn-hero w-fit text-sm">
          <Search className="h-4 w-4" />
          Find leads
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <Headphones className="mb-3 h-8 w-8 text-[oklch(0.82_0.17_210)]" />
          <div className="font-semibold">Co-Pilot flow</div>
          <div className="mt-2 text-sm text-muted-foreground">Briefing, live roleplay, and an AI-scored call readiness report are generated per lead.</div>
        </div>
      </div>
    </AppShell>
  );
}
