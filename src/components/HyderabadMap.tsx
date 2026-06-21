import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { LocalityHeat } from "@/lib/queries.functions";
import { formatINR } from "@/lib/format";

/**
 * Interactive Hyderabad opportunity map.
 * Lat/lng is projected onto a 800x520 SVG; bubble radius/glow encodes opportunity & avg score.
 */

const VIEW_W = 800;
const VIEW_H = 520;
const PAD = 60;

function project(localities: LocalityHeat[]) {
  const lats = localities.map((l) => l.lat);
  const lngs = localities.map((l) => l.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return (lat: number, lng: number) => {
    const x = PAD + ((lng - minLng) / (maxLng - minLng)) * (VIEW_W - PAD * 2);
    // y inverted (north up)
    const y = PAD + ((maxLat - lat) / (maxLat - minLat)) * (VIEW_H - PAD * 2);
    return { x, y };
  };
}

export function HyderabadOpportunityMap({
  data,
  onSelect,
}: {
  data: LocalityHeat[];
  onSelect?: (l: LocalityHeat) => void;
}) {
  const proj = useMemo(() => project(data), [data]);
  const maxOpp = Math.max(1, ...data.map((d) => d.totalOpportunityInr));
  const [hover, setHover] = useState<LocalityHeat | null>(null);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl glass-strong">
      {/* Grid backdrop */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="cityGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="oklch(0.82 0.17 210)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.82 0.17 210)" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={VIEW_W} height={VIEW_H} fill="url(#grid)" />
        {/* Halo */}
        <ellipse cx={VIEW_W / 2} cy={VIEW_H / 2} rx={300} ry={200} fill="url(#cityGlow)" />
        <text x={20} y={30} fill="rgba(255,255,255,0.5)" fontSize="12" fontFamily="Space Grotesk">
          HYDERABAD · LIVE OPPORTUNITY GRID
        </text>

        {/* Connection mesh */}
        {data.map((a, i) =>
          data.slice(i + 1).map((b, j) => {
            const p1 = proj(a.lat, a.lng);
            const p2 = proj(b.lat, b.lng);
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist > 220) return null;
            return (
              <line
                key={`${i}-${j}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="oklch(0.68 0.24 295)" strokeOpacity={0.08} strokeWidth={1}
              />
            );
          }),
        )}

        {/* Locality nodes */}
        {data.map((l) => {
          const { x, y } = proj(l.lat, l.lng);
          const opp = l.totalOpportunityInr / maxOpp;
          const r = 8 + opp * 28;
          const hot = l.avgScore >= 55;
          const color = hot ? "oklch(0.72 0.25 350)" : l.avgScore >= 40 ? "oklch(0.78 0.19 60)" : "oklch(0.82 0.17 210)";
          return (
            <g
              key={l.id}
              transform={`translate(${x},${y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(l)}
              onMouseLeave={() => setHover((h) => (h?.id === l.id ? null : h))}
              onClick={() => onSelect?.(l)}
            >
              <circle r={r * 1.6} fill={color} opacity={0.12} filter="url(#softGlow)" />
              <circle r={r} fill={color} opacity={0.85} />
              <circle r={r + 4} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={1}>
                <animate attributeName="r" from={r + 4} to={r + 18} dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.6" to="0" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <text y={r + 16} textAnchor="middle" fill="white" fontSize="11" fontFamily="Space Grotesk" fontWeight="600">
                {l.name}
              </text>
              <text y={r + 30} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9" fontFamily="Inter">
                {l.businessCount} · {formatINR(l.totalOpportunityInr, { compact: true })}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover panel */}
      {hover && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 p-4 rounded-xl glass-strong min-w-[240px]"
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Locality</div>
          <div className="text-lg font-bold mt-0.5">{hover.name}</div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div>
              <div className="text-muted-foreground">Leads</div>
              <div className="font-semibold text-base">{hover.businessCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Score</div>
              <div className="font-semibold text-base" style={{ color: hover.avgScore >= 55 ? "oklch(0.72 0.25 350)" : "oklch(0.82 0.17 210)" }}>
                {hover.avgScore.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Hot</div>
              <div className="font-semibold text-base">{hover.highValueLeads}</div>
            </div>
          </div>
          <div className="mt-2 text-sm">
            Opportunity <span className="aurora-text font-bold">{formatINR(hover.totalOpportunityInr, { compact: true })}</span>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 p-3 rounded-xl glass text-xs space-y-1.5">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.72 0.25 350)" }} /> High opportunity</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.78 0.19 60)" }} /> Medium</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: "oklch(0.82 0.17 210)" }} /> Emerging</div>
      </div>
    </div>
  );
}