export function formatINR(n: number | bigint, opts: { compact?: boolean } = {}): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (opts.compact) {
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
    if (num >= 1e3) return `₹${(num / 1e3).toFixed(1)}k`;
    return `₹${num.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export function formatNumber(n: number | bigint): string {
  return new Intl.NumberFormat("en-IN").format(typeof n === "bigint" ? Number(n) : n);
}