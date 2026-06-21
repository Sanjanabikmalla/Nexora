import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { MapView } from "@/components/MapView";
import { getBusinesses, getCategoriesAndLocalities } from "@/lib/queries.functions";
import { formatINR } from "@/lib/format";
import { Search, Filter, Globe, Instagram, Star, ArrowRight, Map, Table2, LayoutGrid } from "lucide-react";

const metaQuery = queryOptions({ queryKey: ["cats-locs"], queryFn: () => getCategoriesAndLocalities() });

export const Route = createFileRoute("/_authenticated/discover")({
  loader: ({ context }) => context.queryClient.ensureQueryData(metaQuery),
  component: Discover,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function Discover() {
  const { data: meta } = useSuspenseQuery(metaQuery);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [noWeb, setNoWeb] = useState(false);
  const [noIG, setNoIG] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [view, setView] = useState<"table" | "cards" | "map">("table");

  const filters = { search, category, locality, city, noWebsite: noWeb, noInstagram: noIG, minScore, limit: 300 };
  const leadsQuery = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => getBusinesses({ data: filters }),
  });

  const rows = leadsQuery.data ?? [];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-6">
        <header>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Lead Discovery</div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>
            Find your next 100 customers
          </h1>
        </header>

        <div className="glass-strong p-4 rounded-2xl">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search business name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[oklch(0.68_0.24_295)] outline-none text-sm"
              />
            </div>
            <Select value={category} onChange={setCategory} placeholder="All categories" options={meta.categories.map((c: any) => c.name)} />
            <Select value={city} onChange={setCity} placeholder="All cities" options={["Hyderabad", "Bangalore", "Mumbai"]} />
            <Select value={locality} onChange={setLocality} placeholder="All localities" options={meta.localities.map((l: any) => l.name)} />
            <Toggle on={noWeb} onClick={() => setNoWeb((v) => !v)}>No website</Toggle>
            <Toggle on={noIG} onClick={() => setNoIG((v) => !v)}>No Instagram</Toggle>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              <Filter className="w-3.5 h-3.5" />
              Score &gt;=
              <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-[oklch(0.68_0.24_295)]" />
              <span className="font-bold w-7 text-right">{minScore}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">
            {leadsQuery.isLoading ? "Scanning..." : `${rows.length} leads · ${formatINR(rows.reduce((a, r) => a + r.revenue_opportunity_inr, 0), { compact: true })} total opportunity`}
          </div>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <ViewButton active={view === "table"} onClick={() => setView("table")} icon={<Table2 className="h-3.5 w-3.5" />} label="Table" />
            <ViewButton active={view === "cards"} onClick={() => setView("cards")} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Cards" />
            <ViewButton active={view === "map"} onClick={() => setView("map")} icon={<Map className="h-3.5 w-3.5" />} label="Map" />
          </div>
        </div>

        {view === "map" && <MapView rows={rows} />}
        {view === "cards" && <CardResults rows={rows} />}
        {view === "table" && <TableResults rows={rows} loading={leadsQuery.isLoading} />}
      </div>
    </AppShell>
  );
}

function TableResults({ rows, loading }: { rows: Awaited<ReturnType<typeof getBusinesses>>; loading: boolean }) {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_auto_1fr_auto] gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
        <div>Business</div><div>Category</div><div>Locality</div><div>Signals</div><div className="text-right">Opportunity</div><div className="text-right">Score</div>
      </div>
      <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
        {loading && <div className="p-10 text-center text-muted-foreground"><div className="h-4 w-32 mx-auto shimmer rounded" /></div>}
        {!loading && rows.length === 0 && <div className="p-10 text-center text-muted-foreground">No leads match those filters.</div>}
        {rows.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}
            className="grid grid-cols-[1.6fr_1fr_1fr_auto_1fr_auto] gap-4 items-center px-5 py-3 hover:bg-white/3 transition-colors text-sm"
          >
            <Link to="/business/$id" params={{ id: b.id }} className="font-medium hover:text-[oklch(0.82_0.17_210)] inline-flex items-center gap-1">
              {b.name} <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </Link>
            <div className="text-muted-foreground">{b.category}</div>
            <div className="text-muted-foreground">{b.locality}</div>
            <div className="flex items-center gap-1">
              <Globe className={`w-3.5 h-3.5 ${b.has_website ? "text-[oklch(0.78_0.19_165)]" : "text-white/20"}`} />
              <Instagram className={`w-3.5 h-3.5 ${b.has_instagram ? "text-[oklch(0.78_0.19_165)]" : "text-white/20"}`} />
              <Star className={`w-3.5 h-3.5 ${b.google_review_count >= 30 ? "text-[oklch(0.78_0.19_165)]" : "text-white/20"}`} />
            </div>
            <div className="text-right aurora-text font-semibold">{formatINR(b.revenue_opportunity_inr, { compact: true })}</div>
            <div className="text-right">
              <span className="text-xs font-bold px-2 py-1 rounded-md text-white" style={{ background: b.score >= 70 ? "linear-gradient(120deg, oklch(0.72 0.25 350), oklch(0.78 0.19 60))" : b.score >= 40 ? "oklch(0.65 0.22 255)" : "oklch(0.3 0.04 270)" }}>
                {b.score}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CardResults({ rows }: { rows: Awaited<ReturnType<typeof getBusinesses>> }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {rows.map((b) => (
        <Link key={b.id} to="/business/$id" params={{ id: b.id }} className="glass p-4 rounded-xl border border-transparent transition-colors hover:border-white/15">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{b.category} · {b.locality} · {b.city}</div>
              <div className="mt-1 font-semibold leading-tight">{b.name}</div>
            </div>
            <span className="rounded-md px-2 py-1 text-xs font-bold text-white" style={{ background: b.score >= 70 ? "oklch(0.72 0.25 350)" : b.score >= 40 ? "oklch(0.65 0.22 255)" : "oklch(0.3 0.04 270)" }}>{b.score}</span>
          </div>
          <div className="text-sm text-muted-foreground">{b.pressure_signal ?? "Pressure signal pending."}</div>
          <div className="mt-3 aurora-text text-sm font-bold">{formatINR(b.revenue_opportunity_inr, { compact: true })} / mo</div>
        </Link>
      ))}
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-white text-black" : "text-muted-foreground hover:text-white"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Select({ value, onChange, placeholder, options }: { value: string | null; onChange: (v: string | null) => void; placeholder: string; options: string[] }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[oklch(0.68_0.24_295)] outline-none text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
        on ? "bg-[oklch(0.68_0.24_295)]/20 border-[oklch(0.68_0.24_295)]/40 text-white" : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
