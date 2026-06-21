import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OutreachModal } from "@/components/OutreachModal";
import { PressureCard } from "@/components/PressureCard";
import { addToList, getBusinessDetail } from "@/lib/queries.functions";
import { generateAudit } from "@/lib/ai.functions";
import { formatINR } from "@/lib/format";
import { ArrowLeft, Globe, Instagram, Star, Phone, Mail, MapPin, Brain, Loader2, Sparkles, AlertCircle, Headphones, BookmarkPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business/$id")({
  component: BusinessDetail,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Business not found</div>,
});

function BusinessDetail() {
  const { id } = useParams({ from: "/_authenticated/business/$id" });
  const detailQuery = useQuery({ queryKey: ["biz", id], queryFn: () => getBusinessDetail({ data: { id } }) });
  const [audit, setAudit] = useState<any | null>(null);
  const auditMut = useMutation({
    mutationFn: () => generateAudit({ data: { businessId: id } }),
    onSuccess: (r) => setAudit(r),
  });
  const saveMut = useMutation({ mutationFn: () => addToList({ data: { businessId: id, listName: "Hot Leads" } }) });

  const b = detailQuery.data as any;
  if (detailQuery.isLoading) return <AppShell><div className="p-10"><div className="h-8 w-64 shimmer rounded" /></div></AppShell>;
  if (!b) return <AppShell><div className="p-10">Business not found</div></AppShell>;

  const ls = Array.isArray(b.lead_scores) ? b.lead_scores[0] : b.lead_scores;
  const score = ls?.score ?? 0;
  const opp = Number(ls?.revenue_opportunity_inr ?? 0);
  const breakdown = (ls?.breakdown ?? []) as { reason: string; points: number }[];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 max-w-6xl space-y-8">
        <Link to="/discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to discovery
        </Link>

        <PressureCard
          businessId={id}
          timing={b.strike_timing}
          signal={b.pressure_signal}
          competitorCount={b.competitor_count_nearby}
          reviewResponses={b.google_review_responses}
        />

        <header className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{b.categories?.name} · {b.localities?.name}</div>
            <h1 className="text-4xl font-bold tracking-tight mt-2" style={{ fontFamily: "Space Grotesk" }}>{b.name}</h1>
            <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
              {b.address && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {b.address}</span>}
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {b.city ?? b.localities?.city ?? "India"}</span>
              {b.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {b.phone}</span>}
              {b.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {b.email}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/copilot/$id" params={{ id }} className="btn-hero text-sm">
                <Headphones className="w-4 h-4" />
                Prepare to Call
              </Link>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                {saveMut.data?.duplicate ? "Already saved" : "Save to List"}
              </button>
              <OutreachModal businessId={id} />
            </div>
          </div>

          <div className="glass-strong p-5 rounded-2xl text-center min-w-[240px]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Lead Score</div>
            <div className="text-7xl font-bold aurora-text my-2" style={{ fontFamily: "Space Grotesk" }}>{score}</div>
            <div className="text-xs text-muted-foreground">/100 — {(Number(ls?.conversion_probability ?? 0) * 100).toFixed(0)}% conversion likely</div>
          </div>
        </header>

        {/* Signals */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SignalCard icon={Globe} label="Website" good={b.has_website} value={b.has_website ? (b.website ?? "Present") : "Missing"} />
          <SignalCard icon={Instagram} label="Instagram" good={b.has_instagram} value={b.has_instagram ? (b.instagram_handle ?? "Active") : "Not found"} />
          <SignalCard icon={Star} label="Google Reviews" good={b.google_review_count >= 30} value={`${b.google_review_count} reviews · ${b.google_rating ?? "—"}★`} />
          <SignalCard icon={Brain} label="Est. Monthly Rev" good value={formatINR(Number(b.estimated_monthly_revenue_inr), { compact: true })} />
        </section>

        {/* Score breakdown */}
        <section className="glass-strong p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>Why this lead is hot</h2>
            <div className="text-sm aurora-text font-bold">{formatINR(opp, { compact: true })} opportunity / mo</div>
          </div>
          {breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground">Strong digital presence — lower opportunity, but worth a relationship play.</div>
          ) : (
            <div className="space-y-2">
              {breakdown.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3 text-sm">
                    <AlertCircle className="w-4 h-4 text-[oklch(0.72_0.25_350)]" />
                    {r.reason}
                  </div>
                  <div className="text-sm font-bold">+{r.points}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Audit */}
        <section className="glass-strong p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>AI Growth Audit</h2>
              <p className="text-sm text-muted-foreground mt-1">Live analysis powered by Gemini — website, SEO, reviews, social, competition.</p>
            </div>
            <button
              onClick={() => auditMut.mutate()}
              disabled={auditMut.isPending}
              className="btn-hero text-sm"
            >
              {auditMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {audit ? "Regenerate audit" : "Generate audit"}
            </button>
          </div>

          {auditMut.isError && <div className="text-sm text-[oklch(0.72_0.25_350)]">Audit failed: {(auditMut.error as any)?.message}</div>}

          {!audit && !auditMut.isPending && <div className="text-sm text-muted-foreground">Click "Generate audit" to run the full AI growth analysis.</div>}
          {auditMut.isPending && (
            <div className="space-y-3">
              <div className="h-4 w-3/4 shimmer rounded" />
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-5/6 shimmer rounded" />
            </div>
          )}
          {audit && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mt-3">
              {audit.summary && <p className="text-base leading-relaxed">{audit.summary}</p>}
              <AuditSection title="Website" data={audit.website_audit} />
              <AuditSection title="SEO" data={audit.seo_audit} />
              <AuditSection title="Reviews" data={audit.reviews_audit} />
              <AuditSection title="Social" data={audit.social_audit} />
              <AuditSection title="Competition" data={audit.competition} />
              {audit.growth_opportunities && (
                <div>
                  <h3 className="font-bold mb-2">Growth opportunities</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {audit.growth_opportunities.map((g: string, i: number) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}
              {audit.recommended_services && (
                <div>
                  <h3 className="font-bold mb-2">Recommended services</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {audit.recommended_services.map((s: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{s.name}</div>
                          <div className="aurora-text font-bold text-sm">{formatINR(s.price_inr_monthly, { compact: true })}/mo</div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{s.why}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {audit.expected_revenue_lift_inr_monthly != null && (
                <div className="glass p-4 rounded-xl">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Expected revenue lift</div>
                  <div className="text-3xl font-bold aurora-text mt-1" style={{ fontFamily: "Space Grotesk" }}>
                    {formatINR(audit.expected_revenue_lift_inr_monthly, { compact: true })}/mo
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SignalCard({ icon: Icon, label, good, value }: { icon: any; label: string; good: boolean; value: React.ReactNode }) {
  return (
    <div className="glass p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <Icon className={`w-4 h-4 ${good ? "text-[oklch(0.78_0.19_165)]" : "text-[oklch(0.72_0.25_350)]"}`} />
      </div>
      <div className="text-sm font-medium mt-1 truncate">{value}</div>
    </div>
  );
}

function AuditSection({ title, data }: { title: string; data: any }) {
  if (!data) return null;
  return (
    <div className="border-t border-white/5 pt-4">
      <h3 className="font-bold mb-2">{title}</h3>
      {data.summary && <p className="text-sm text-muted-foreground mb-2">{data.summary}</p>}
      {data.status && <div className="text-sm mb-2"><span className="text-muted-foreground">Status:</span> {data.status}</div>}
      {typeof data.score === "number" && <div className="text-sm mb-2"><span className="text-muted-foreground">Score:</span> {data.score}/100</div>}
      {data.issues?.length > 0 && (
        <div className="mb-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Issues</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">{data.issues.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {data.recommendations?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Recommendations</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">{data.recommendations.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {data.threats?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Threats</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">{data.threats.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
