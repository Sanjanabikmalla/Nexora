import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HyderabadOpportunityMap } from "@/components/HyderabadMap";
import { Stat } from "@/components/Stat";
import { getDashboardStats, getLocalityHeatmap, getBusinesses, getStrikeDashboard, type LocalityHeat } from "@/lib/queries.functions";
import { formatINR, formatNumber } from "@/lib/format";
import { Brain, Target, Zap, Sparkles, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
const heatQuery = queryOptions({ queryKey: ["heatmap"], queryFn: () => getLocalityHeatmap() });
const topLeadsQuery = queryOptions({
  queryKey: ["top-leads"],
  queryFn: () => getBusinesses({ data: { minScore: 70, limit: 8 } }),
});
const strikeQuery = queryOptions({ queryKey: ["strike-dashboard"], queryFn: () => getStrikeDashboard() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(statsQuery),
    context.queryClient.ensureQueryData(heatQuery),
    context.queryClient.ensureQueryData(topLeadsQuery),
    context.queryClient.ensureQueryData(strikeQuery),
  ]),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Dashboard() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  const { data: heat } = useSuspenseQuery(heatQuery);
  const { data: topLeads } = useSuspenseQuery(topLeadsQuery);
  const { data: strike } = useSuspenseQuery(strikeQuery);
  const [selected, setSelected] = useState<LocalityHeat | null>(null);

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Hyderabad · Live</div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>
              Opportunity Command Center
            </h1>
          </div>
          <Link to="/discover" className="btn-hero text-sm"><Target className="w-4 h-4" /> Run new scan</Link>
        </header>

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total leads" value={formatNumber(stats.totalBusinesses)} sub={`${stats.totalLocalities} localities · ${stats.totalCategories} categories`} icon={<Target className="w-4 h-4" />} color="violet" />
          <Stat label="High-value leads" value={stats.highOpportunityLeads} sub="Score ≥ 70" icon={<Brain className="w-4 h-4" />} color="pink" delay={0.05} />
          <Stat label="Revenue opportunity" value={formatINR(stats.totalOpportunityInr, { compact: true })} sub="Projected monthly uplift" icon={<Zap className="w-4 h-4" />} color="cyan" delay={0.1} />
          <Stat label="Avg conversion" value={`${(stats.avgConversion * 100).toFixed(1)}%`} sub={`Avg score ${stats.avgScore.toFixed(0)}/100`} icon={<Sparkles className="w-4 h-4" />} color="mint" delay={0.15} />
        </div>

        {/* HEATMAP — centerpiece */}
        <section className="grid xl:grid-cols-[1fr_1.4fr] gap-4">
          <div className="glass-strong p-5 rounded-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's Top Strikes</div>
            <div className="mt-4 space-y-3">
              {strike.topStrikes.map((b) => (
                <Link key={b.id} to="/business/$id" params={{ id: b.id }} className="block rounded-xl border border-white/8 bg-white/5 p-4 transition-colors hover:border-white/18">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{b.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{b.category} · {b.locality} · {b.city}</div>
                    </div>
                    <span className="rounded-md bg-[oklch(0.72_0.25_350)]/18 px-2 py-1 text-xs font-bold text-[oklch(0.9_0.14_350)]">{b.strike_timing ?? "WAIT"}</span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">{b.pressure_signal ?? "Pressure signal pending."}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <ChartCard title="Leads by category">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={strike.byCategory}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  <Bar dataKey="leads" fill="oklch(0.82 0.17 210)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Score mix">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={strike.scoreDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={4}>
                    {strike.scoreDistribution.map((_, i) => <Cell key={i} fill={["oklch(0.72 0.25 350)", "oklch(0.78 0.19 80)", "oklch(0.82 0.17 210)"][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="7-day activity">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={strike.activity}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.03 270)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="scans" stroke="oklch(0.82 0.17 210)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="strikes" stroke="oklch(0.72 0.25 350)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid lg:grid-cols-[1.4fr_1fr] gap-5"
        >
          <div className="h-[560px]">
            <HyderabadOpportunityMap data={heat} onSelect={setSelected} />
          </div>

          {/* Locality detail rail */}
          <div className="glass-strong p-5 rounded-2xl flex flex-col">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Locality drill-down</div>
            <h2 className="text-2xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>
              {selected?.name ?? heat[0]?.name ?? "Hyderabad"}
            </h2>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <Metric label="Leads" value={selected?.businessCount ?? heat[0]?.businessCount ?? 0} />
              <Metric label="Hot" value={selected?.highValueLeads ?? heat[0]?.highValueLeads ?? 0} accent />
              <Metric label="Avg Score" value={(selected?.avgScore ?? heat[0]?.avgScore ?? 0).toFixed(0)} />
            </div>
            <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="text-xs text-muted-foreground">Revenue opportunity</div>
              <div className="text-3xl font-bold aurora-text mt-1" style={{ fontFamily: "Space Grotesk" }}>
                {formatINR(selected?.totalOpportunityInr ?? heat[0]?.totalOpportunityInr ?? 0, { compact: true })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">/month, untapped</div>
            </div>
            <div className="mt-5 flex-1 overflow-y-auto space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">All Localities</div>
              {heat.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${
                    (selected?.id ?? heat[0]?.id) === l.id ? "bg-white/8 border border-white/10" : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{l.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {l.businessCount} · {formatINR(l.totalOpportunityInr, { compact: true })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Top leads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>Hottest leads right now</h2>
            <Link to="/discover" className="text-xs text-muted-foreground hover:text-white inline-flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {topLeads.slice(0, 8).map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass p-4 rounded-xl group hover:border-white/20 border border-transparent transition-colors"
              >
                <Link to="/business/$id" params={{ id: b.id }} className="block">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-xs text-muted-foreground">{b.category} · {b.locality}</div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md aurora-bg text-white">{b.score}</span>
                  </div>
                  <div className="font-semibold leading-tight">{b.name}</div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    {!b.has_website && <span className="px-1.5 py-0.5 rounded bg-[oklch(0.72_0.25_350)]/15 text-[oklch(0.85_0.18_350)]">No site</span>}
                    {!b.has_instagram && <span className="px-1.5 py-0.5 rounded bg-[oklch(0.78_0.19_60)]/15 text-[oklch(0.88_0.18_70)]">No IG</span>}
                    <span className="ml-auto aurora-text font-semibold">{formatINR(b.revenue_opportunity_inr, { compact: true })}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl p-3 bg-white/5 border border-white/5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${accent ? "text-[oklch(0.72_0.25_350)]" : ""}`} style={{ fontFamily: "Space Grotesk" }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
