import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crosshair, Layers, MapPin } from "lucide-react";
import type { BusinessRow } from "@/lib/queries.functions";
import { formatINR } from "@/lib/format";

const VIEW_W = 900;
const VIEW_H = 560;
const PAD = 56;

export function MapView({ rows }: { rows: BusinessRow[] }) {
  const [density, setDensity] = useState(true);
  const [active, setActive] = useState<BusinessRow | null>(null);
  const project = useMemo(() => {
    const lats = rows.map((r) => r.lat).filter((n): n is number => Number.isFinite(n));
    const lngs = rows.map((r) => r.lng).filter((n): n is number => Number.isFinite(n));
    const minLat = Math.min(...lats, 12.8);
    const maxLat = Math.max(...lats, 19.2);
    const minLng = Math.min(...lngs, 72.7);
    const maxLng = Math.max(...lngs, 78.6);
    return (lat?: number | null, lng?: number | null) => ({
      x: PAD + (((lng ?? minLng) - minLng) / Math.max(maxLng - minLng, 0.01)) * (VIEW_W - PAD * 2),
      y: PAD + ((maxLat - (lat ?? minLat)) / Math.max(maxLat - minLat, 0.01)) * (VIEW_H - PAD * 2),
    });
  }, [rows]);

  return (
    <div className="relative h-[620px] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 p-2 text-xs">
        <Crosshair className="h-3.5 w-3.5" />
        {rows.length} mapped leads
        <button
          onClick={() => setDensity((v) => !v)}
          className={`ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 ${density ? "bg-white/12 text-white" : "text-muted-foreground"}`}
        >
          <Layers className="h-3.5 w-3.5" />
          Density
        </button>
      </div>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="mapGrid" width="45" height="45" patternUnits="userSpaceOnUse">
            <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
          </pattern>
          <filter id="pinGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#mapGrid)" />
        <path d="M90 440 C210 330 260 400 390 305 C520 210 620 260 770 130" fill="none" stroke="oklch(0.82 0.17 210 / 0.18)" strokeWidth="14" strokeLinecap="round" />
        <path d="M120 180 C270 220 370 150 520 190 C645 222 710 298 820 270" fill="none" stroke="oklch(0.68 0.24 295 / 0.16)" strokeWidth="10" strokeLinecap="round" />
        {density && rows.slice(0, 90).map((r) => {
          const p = project(r.lat, r.lng);
          return <circle key={`d-${r.id}`} cx={p.x} cy={p.y} r={18 + Math.min(r.competitor_count_nearby ?? 0, 12) * 2} fill="oklch(0.72 0.25 350 / 0.055)" />;
        })}
        {rows.map((r) => {
          const p = project(r.lat, r.lng);
          const color = r.score >= 70 ? "oklch(0.72 0.25 350)" : r.score >= 45 ? "oklch(0.78 0.19 80)" : "oklch(0.82 0.17 210)";
          return (
            <g key={r.id} transform={`translate(${p.x},${p.y})`} onClick={() => setActive(r)} className="cursor-pointer">
              <circle r={12} fill={color} opacity="0.22" filter="url(#pinGlow)" />
              <circle r={7} fill={color} />
              <text y={-13} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{r.score}</text>
            </g>
          );
        })}
      </svg>
      {active && (
        <div className="absolute bottom-4 left-4 max-w-sm rounded-xl border border-white/10 bg-[oklch(0.16_0.03_270)] p-4 shadow-2xl">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="font-semibold leading-tight">{active.name}</div>
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold">{active.score}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {active.city ?? "India"} · {active.locality ?? "Unknown locality"}
          </div>
          <div className="mt-3 text-sm">
            <span className="aurora-text font-bold">{formatINR(active.revenue_opportunity_inr, { compact: true })}</span> projected monthly opportunity
          </div>
          <Link to="/business/$id" params={{ id: active.id }} className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-bold text-black">
            Strike Now
          </Link>
        </div>
      )}
    </div>
  );
}
