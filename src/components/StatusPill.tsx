const STATUSES = ["New", "Contacted", "Qualified", "Converted", "Discarded"] as const;

const statusClass: Record<string, string> = {
  New: "border-white/10 bg-white/8 text-white/75",
  Contacted: "border-[oklch(0.82_0.17_210)]/30 bg-[oklch(0.82_0.17_210)]/12 text-[oklch(0.9_0.1_210)]",
  Qualified: "border-[oklch(0.78_0.19_165)]/30 bg-[oklch(0.78_0.19_165)]/12 text-[oklch(0.9_0.12_165)]",
  Converted: "border-[oklch(0.78_0.19_80)]/35 bg-[oklch(0.78_0.19_80)]/14 text-[oklch(0.92_0.13_80)]",
  Discarded: "border-[oklch(0.72_0.25_350)]/30 bg-[oklch(0.72_0.25_350)]/12 text-[oklch(0.88_0.16_350)]",
};

export function StatusPill({ status, onChange }: { status: string; onChange?: (status: string) => void }) {
  const currentIndex = Math.max(0, STATUSES.findIndex((s) => s === status));
  const next = STATUSES[(currentIndex + 1) % STATUSES.length];
  return (
    <button
      type="button"
      onClick={() => onChange?.(next)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${statusClass[status] ?? statusClass.New}`}
    >
      {status}
    </button>
  );
}
