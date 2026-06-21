import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Target, Brain, Globe2 } from "lucide-react";
import { getDashboardStats } from "@/lib/queries.functions";
import { formatINR, formatNumber } from "@/lib/format";
import { Stat } from "@/components/Stat";
import { NexoraEarth } from "@/components/Earth";

const HYDERABAD = { lat: 17.385, lng: 78.4867 };
const HYD_MARKERS = [
  { ...HYDERABAD, color: "#ff4dd2" },
  { lat: 28.6139, lng: 77.209, color: "#7c4dff" }, // Delhi
  { lat: 19.076, lng: 72.8777, color: "#7c4dff" },  // Mumbai
  { lat: 12.9716, lng: 77.5946, color: "#7c4dff" }, // Bangalore
  { lat: 1.3521, lng: 103.8198, color: "#00e5ff" }, // Singapore
  { lat: 25.2048, lng: 55.2708, color: "#00e5ff" }, // Dubai
  { lat: 40.7128, lng: -74.006, color: "#00e5ff" }, // NYC
];

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXORA AI — Every Business Is An Opportunity" },
      { name: "description", content: "AI-powered business intelligence that discovers, scores and prioritises high-value leads across Hyderabad and beyond." },
      { property: "og:title", content: "NEXORA AI" },
      { property: "og:description", content: "Every Business Is An Opportunity." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: Landing,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="glass-strong p-6 rounded-xl max-w-md">{error.message}</div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Landing() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Top nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 lg:px-10 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg aurora-bg glow-violet flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-lg leading-none">NEXORA</div>
            <div className="text-[10px] text-muted-foreground tracking-[0.2em]">AI · INTELLIGENCE</div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-white px-4 py-2">Sign in</Link>
          <Link to="/dashboard" className="btn-hero text-sm">
            Launch Platform <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen grid lg:grid-cols-[1fr_1.1fr] items-center px-6 lg:px-10 pt-32 lg:pt-0 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.78_0.19_165)] animate-pulse" />
            Scanning {formatNumber(stats.totalBusinesses)} businesses across Hyderabad — live
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.95]" style={{ fontFamily: "Space Grotesk" }}>
            Every business on Earth<br />
            is a <span className="aurora-text">potential customer.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            NEXORA AI discovers, scores, predicts and prioritises high-value business opportunities across Hyderabad —
            so your team only ever calls leads that are ready to buy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/dashboard" className="btn-hero">
              <Zap className="w-4 h-4" /> Start Intelligence Scan
            </Link>
            <Link to="/dashboard" className="btn-ghost-glow">
              <Globe2 className="w-4 h-4" /> Explore Live Platform
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
            <div className="glass p-3 rounded-xl">
              <div className="text-xs text-muted-foreground">Avg Lead Score</div>
              <div className="text-2xl font-bold mt-1 aurora-text">{stats.avgScore.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-xs text-muted-foreground">High-Value Leads</div>
              <div className="text-2xl font-bold mt-1">{stats.highOpportunityLeads}</div>
            </div>
            <div className="glass p-3 rounded-xl">
              <div className="text-xs text-muted-foreground">Opportunity</div>
              <div className="text-2xl font-bold mt-1">{formatINR(stats.totalOpportunityInr, { compact: true })}</div>
            </div>
          </div>
        </motion.div>

        <div className="relative h-[60vh] lg:h-[88vh] w-full">
          <NexoraEarth markers={HYD_MARKERS} className="w-full h-full" interactive spin={0.06} />
          <div className="absolute bottom-6 left-6 glass-strong p-3 rounded-xl text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.25_350)] animate-pulse" />
            Hyderabad node · Active scan
          </div>
        </div>
      </section>

      {/* Live metrics band */}
      <section className="px-6 lg:px-10 py-20 max-w-7xl mx-auto">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">Live · from your database</div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-10" style={{ fontFamily: "Space Grotesk" }}>
          Intelligence, in real time.
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Businesses scanned" value={formatNumber(stats.totalBusinesses)} sub={`Across ${stats.totalLocalities} Hyderabad localities`} icon={<Target className="w-4 h-4" />} color="violet" />
          <Stat label="Revenue opportunity" value={formatINR(stats.totalOpportunityInr, { compact: true })} sub="Untapped, this month" icon={<Zap className="w-4 h-4" />} color="pink" delay={0.05} />
          <Stat label="High-value leads" value={stats.highOpportunityLeads} sub="Score ≥ 70" icon={<Brain className="w-4 h-4" />} color="cyan" delay={0.1} />
          <Stat label="Avg conversion" value={`${(stats.avgConversion * 100).toFixed(1)}%`} sub="Predicted probability" icon={<Sparkles className="w-4 h-4" />} color="mint" delay={0.15} />
        </div>
      </section>

      {/* Capabilities */}
      <section className="px-6 lg:px-10 py-20 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-5">
          {[
            { t: "Discover", d: "278+ Hyderabad businesses across restaurants, salons, clinics, gyms, schools, real estate. Filterable by website, social presence, revenue, team size.", i: Globe2 },
            { t: "Score", d: "Every business gets a 0–100 opportunity score with explainable reasons: no website, weak Google reviews, no Instagram, recent founding.", i: Brain },
            { t: "Act", d: "AI Sales Copilot writes outreach, generates growth audits and predicts revenue lift — grounded on live opportunity data.", i: Zap },
          ].map((c, i) => (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass p-6 rounded-2xl"
            >
              <c.i className="w-6 h-6 text-[oklch(0.82_0.17_210)] mb-4" />
              <h3 className="text-2xl font-bold mb-2">{c.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-10 py-32 text-center max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6" style={{ fontFamily: "Space Grotesk" }}>
          Your next 100 customers <span className="aurora-text">already exist.</span>
        </h2>
        <p className="text-muted-foreground mb-8">They just don't know about you yet. Nexora finds them.</p>
        <Link to="/dashboard" className="btn-hero">
          Launch Command Center <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-white/5 px-6 lg:px-10 py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span>© Nexora AI · Hyderabad</span>
        <span>Every Business Is An Opportunity.</span>
      </footer>
    </div>
  );
}
