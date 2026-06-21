import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { exportListCSV, getListDetail, updateListItem } from "@/lib/queries.functions";
import { formatINR } from "@/lib/format";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lists/$id")({
  component: ListDetailPage,
});

function ListDetailPage() {
  const { id } = useParams({ from: "/_authenticated/lists/$id" });
  const queryClient = useQueryClient();
  const listQuery = useQuery({ queryKey: ["list", id], queryFn: () => getListDetail({ data: { id } }) });
  const [csv, setCsv] = useState<string | null>(null);
  const updateMutation = useMutation({
    mutationFn: ({ itemId, status, notes }: { itemId: string; status?: any; notes?: string }) => updateListItem({ data: { itemId, status, notes } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list", id] }),
  });
  const exportMutation = useMutation({
    mutationFn: () => exportListCSV({ data: { id } }),
    onSuccess: setCsv,
  });
  const list = listQuery.data as any;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-6">
        <Link to="/lists" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to lists
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Saved List</div>
            <h1 className="text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>{list?.name ?? "List"}</h1>
          </div>
          <button onClick={() => exportMutation.mutate()} className="btn-hero text-sm" disabled={exportMutation.isPending}>
            {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        </header>
        {csv && <textarea readOnly value={csv} className="h-40 w-full rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-xs" />}
        <div className="glass-strong overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[1.5fr_1fr_auto_1.5fr] gap-4 border-b border-white/5 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div>Lead</div><div>Opportunity</div><div>Status</div><div>Notes</div>
          </div>
          <div className="divide-y divide-white/5">
            {list?.items?.map((item: any) => {
              const b = item.businesses;
              const score = Array.isArray(b?.lead_scores) ? b.lead_scores[0] : b?.lead_scores;
              return (
                <div key={item.id} className="grid grid-cols-[1.5fr_1fr_auto_1.5fr] items-center gap-4 px-5 py-4 text-sm">
                  <div>
                    <Link to="/business/$id" params={{ id: b.id }} className="font-semibold hover:text-[oklch(0.82_0.17_210)]">{b.name}</Link>
                    <div className="mt-1 text-xs text-muted-foreground">{b.categories?.name} · {b.localities?.name} · {b.city}</div>
                    {list.items.filter((x: any) => x.businesses?.id === b.id).length > 1 && <div className="mt-2 text-xs text-[oklch(0.82_0.17_80)]">Duplicate</div>}
                  </div>
                  <div>
                    <div className="font-bold aurora-text">{formatINR(Number(score?.revenue_opportunity_inr ?? 0), { compact: true })}</div>
                    <div className="text-xs text-muted-foreground">Score {score?.score ?? 0}</div>
                  </div>
                  <StatusPill status={item.status} onChange={(status) => updateMutation.mutate({ itemId: item.id, status })} />
                  <input
                    defaultValue={item.notes ?? ""}
                    onBlur={(e) => updateMutation.mutate({ itemId: item.id, notes: e.target.value })}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    placeholder="Add notes"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
