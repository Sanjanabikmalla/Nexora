import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Radar } from "lucide-react";
import { generatePressureSignal } from "@/lib/ai.functions";

type PressureTiming = "NOW" | "SOON" | "WAIT" | string;

const timingStyles: Record<string, { label: string; dot: string; border: string }> = {
  NOW: {
    label: "NOW",
    dot: "bg-[oklch(0.72_0.25_350)] shadow-[0_0_22px_oklch(0.72_0.25_350/0.75)]",
    border: "border-l-[oklch(0.72_0.25_350)]",
  },
  SOON: {
    label: "SOON",
    dot: "bg-[oklch(0.82_0.17_80)] shadow-[0_0_22px_oklch(0.82_0.17_80/0.65)]",
    border: "border-l-[oklch(0.82_0.17_80)]",
  },
  WAIT: {
    label: "WAIT",
    dot: "bg-white/45 shadow-[0_0_16px_rgb(255_255_255/0.2)]",
    border: "border-l-white/20",
  },
};

export function PressureCard({
  businessId,
  timing,
  signal,
  competitorCount,
  reviewResponses,
}: {
  businessId: string;
  timing?: PressureTiming | null;
  signal?: string | null;
  competitorCount?: number | null;
  reviewResponses?: number | null;
}) {
  const queryClient = useQueryClient();
  const t = timingStyles[timing || "WAIT"] ?? timingStyles.WAIT;
  const pressureMutation = useMutation({
    mutationFn: () => generatePressureSignal({ data: { businessId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["biz", businessId] }),
  });

  return (
    <section className={`relative overflow-hidden rounded-2xl border border-white/10 border-l-4 ${t.border} bg-black/45 p-5 shadow-[0_0_40px_rgb(255_30_90/0.12)]`}>
      <div className="absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,oklch(0.72_0.25_350/0.22),transparent_70%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${t.dot} animate-pulse`} />
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/70">Strike Intelligence</div>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold">{t.label}</span>
          </div>
          <p className="max-w-3xl font-mono text-sm leading-6 text-white/85">
            {pressureMutation.data?.pressure_signal ?? signal ?? "WAIT: Pressure signal pending. Run a live regeneration when the lead is ready to evaluate."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
          <MiniMetric icon={<Radar className="h-4 w-4" />} label="Nearby rivals" value={competitorCount ?? 0} />
          <MiniMetric icon={<Activity className="h-4 w-4" />} label="Review replies" value={reviewResponses ?? 0} />
          <button
            onClick={() => pressureMutation.mutate()}
            disabled={pressureMutation.isPending}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/12 disabled:opacity-60"
          >
            {pressureMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            Regenerate signal
          </button>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ fontFamily: "Space Grotesk" }}>{value}</div>
    </div>
  );
}
