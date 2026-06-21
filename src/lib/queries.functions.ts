import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<any>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type DashboardStats = {
  totalBusinesses: number;
  highOpportunityLeads: number;
  totalOpportunityInr: number;
  avgScore: number;
  totalLocalities: number;
  totalCategories: number;
  avgConversion: number;
};

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardStats> => {
  const sb = publicClient();
  const [{ count: totalBusinesses }, { count: highOpportunityLeads }, scoresRes, locRes, catRes] = await Promise.all([
    sb.from("businesses").select("*", { count: "exact", head: true }),
    sb.from("lead_scores").select("*", { count: "exact", head: true }).gte("score", 70),
    sb.from("lead_scores").select("score, revenue_opportunity_inr, conversion_probability"),
    sb.from("localities").select("*", { count: "exact", head: true }),
    sb.from("categories").select("*", { count: "exact", head: true }),
  ]);
  const scores = scoresRes.data ?? [];
  const totalOpportunityInr = scores.reduce((a, s) => a + Number(s.revenue_opportunity_inr ?? 0), 0);
  const avgScore = scores.length ? scores.reduce((a, s) => a + (s.score ?? 0), 0) / scores.length : 0;
  const avgConversion = scores.length ? scores.reduce((a, s) => a + Number(s.conversion_probability ?? 0), 0) / scores.length : 0;
  return {
    totalBusinesses: totalBusinesses ?? 0,
    highOpportunityLeads: highOpportunityLeads ?? 0,
    totalOpportunityInr,
    avgScore,
    totalLocalities: locRes.count ?? 0,
    totalCategories: catRes.count ?? 0,
    avgConversion,
  };
});

export type LocalityHeat = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  businessCount: number;
  avgScore: number;
  totalOpportunityInr: number;
  highValueLeads: number;
};

export const getLocalityHeatmap = createServerFn({ method: "GET" }).handler(async (): Promise<LocalityHeat[]> => {
  const sb = publicClient();
  const { data: localities } = await sb.from("localities").select("id, name, lat, lng");
  const { data: businesses } = await sb
    .from("businesses")
    .select("id, locality_id, lead_scores(score, revenue_opportunity_inr)");
  const map = new Map<string, LocalityHeat>();
  for (const l of localities ?? []) {
    map.set(l.id, {
      id: l.id, name: l.name, lat: Number(l.lat), lng: Number(l.lng),
      businessCount: 0, avgScore: 0, totalOpportunityInr: 0, highValueLeads: 0,
    });
  }
  const scoreSums = new Map<string, { sum: number; n: number }>();
  for (const b of businesses ?? []) {
    if (!b.locality_id) continue;
    const entry = map.get(b.locality_id);
    if (!entry) continue;
    entry.businessCount += 1;
    const s = (b as any).lead_scores;
    const score = Array.isArray(s) ? (s[0]?.score ?? 0) : (s?.score ?? 0);
    const opp = Array.isArray(s) ? Number(s[0]?.revenue_opportunity_inr ?? 0) : Number(s?.revenue_opportunity_inr ?? 0);
    entry.totalOpportunityInr += opp;
    if (score >= 70) entry.highValueLeads += 1;
    const ss = scoreSums.get(b.locality_id) ?? { sum: 0, n: 0 };
    ss.sum += score; ss.n += 1;
    scoreSums.set(b.locality_id, ss);
  }
  for (const [id, ss] of scoreSums) {
    const e = map.get(id);
    if (e) e.avgScore = ss.n ? ss.sum / ss.n : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.totalOpportunityInr - a.totalOpportunityInr);
});

export type BusinessRow = {
  id: string;
  name: string;
  category: string | null;
  locality: string | null;
  has_website: boolean;
  has_instagram: boolean;
  google_rating: number | null;
  google_review_count: number;
  employee_count: number;
  estimated_monthly_revenue_inr: number;
  score: number;
  revenue_opportunity_inr: number;
  conversion_probability: number;
  city: string | null;
  lat: number | null;
  lng: number | null;
  pressure_signal: string | null;
  strike_timing: string | null;
  competitor_count_nearby: number;
  google_review_responses: number;
};

const FilterSchema = z.object({
  category: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  noWebsite: z.boolean().optional(),
  noInstagram: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
});

export const getBusinesses = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FilterSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<BusinessRow[]> => {
    const sb = publicClient();
    let q = sb
      .from("businesses")
      .select("id, name, city, has_website, has_instagram, google_rating, google_review_count, employee_count, estimated_monthly_revenue_inr, pressure_signal, strike_timing, competitor_count_nearby, google_review_responses, categories(name), localities(name, city, lat, lng), lead_scores(score, revenue_opportunity_inr, conversion_probability)");
    if (data.noWebsite) q = q.eq("has_website", false);
    if (data.noInstagram) q = q.eq("has_instagram", false);
    if (data.search && data.search.trim()) q = q.ilike("name", `%${data.search.trim()}%`);
    const { data: rows } = await q.limit(data.limit ?? 200);
    let out: BusinessRow[] = (rows ?? []).map((r: any) => {
      const ls = Array.isArray(r.lead_scores) ? r.lead_scores[0] : r.lead_scores;
      return {
        id: r.id,
        name: r.name,
        category: r.categories?.name ?? null,
        locality: r.localities?.name ?? null,
        city: r.city ?? r.localities?.city ?? null,
        lat: r.localities?.lat != null ? Number(r.localities.lat) : null,
        lng: r.localities?.lng != null ? Number(r.localities.lng) : null,
        has_website: r.has_website,
        has_instagram: r.has_instagram,
        google_rating: r.google_rating,
        google_review_count: r.google_review_count,
        employee_count: r.employee_count,
        estimated_monthly_revenue_inr: Number(r.estimated_monthly_revenue_inr),
        score: ls?.score ?? 0,
        revenue_opportunity_inr: Number(ls?.revenue_opportunity_inr ?? 0),
        conversion_probability: Number(ls?.conversion_probability ?? 0),
        pressure_signal: r.pressure_signal ?? null,
        strike_timing: r.strike_timing ?? null,
        competitor_count_nearby: r.competitor_count_nearby ?? 0,
        google_review_responses: r.google_review_responses ?? 0,
      };
    });
    if (data.category) out = out.filter((r) => r.category === data.category);
    if (data.locality) out = out.filter((r) => r.locality === data.locality);
    if (data.city) out = out.filter((r) => r.city === data.city);
    if (data.minScore != null) out = out.filter((r) => r.score >= data.minScore!);
    out.sort((a, b) => b.score - a.score || b.revenue_opportunity_inr - a.revenue_opportunity_inr);
    return out;
  });

export const getCategoriesAndLocalities = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [cats, locs] = await Promise.all([
    sb.from("categories").select("id, name, icon").order("name"),
    sb.from("localities").select("id, name, lat, lng").order("name"),
  ]);
  return { categories: cats.data ?? [], localities: locs.data ?? [] };
});

export const getBusinessDetail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("businesses")
      .select("*, categories(name, icon), localities(name, city, lat, lng), lead_scores(*)")
      .eq("id", data.id)
      .maybeSingle();
    return row;
  });

export const getStrikeDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await getBusinesses({ data: { limit: 500 } });
  const byCategory = Object.values(rows.reduce((acc: Record<string, { name: string; leads: number; opportunity: number }>, r) => {
    const key = r.category ?? "Uncategorized";
    acc[key] ??= { name: key, leads: 0, opportunity: 0 };
    acc[key].leads += 1;
    acc[key].opportunity += r.revenue_opportunity_inr;
    return acc;
  }, {})).sort((a, b) => b.leads - a.leads).slice(0, 8);
  const scoreDistribution = [
    { name: "Hot", value: rows.filter((r) => r.score >= 70).length },
    { name: "Warm", value: rows.filter((r) => r.score >= 40 && r.score < 70).length },
    { name: "Watch", value: rows.filter((r) => r.score < 40).length },
  ];
  const activity = Array.from({ length: 7 }, (_, i) => {
    const hot = rows.filter((r) => r.score >= 70).length;
    return { day: `D-${6 - i}`, scans: Math.max(3, Math.round(rows.length / 14 + i * 2)), strikes: Math.max(1, Math.round(hot / 12 + i)) };
  });
  const topStrikes = [...rows].sort((a, b) => {
    const timingWeight = (x: BusinessRow) => x.strike_timing === "NOW" ? 2 : x.strike_timing === "SOON" ? 1 : 0;
    return timingWeight(b) - timingWeight(a) || b.score - a.score;
  }).slice(0, 3);
  return { byCategory, scoreDistribution, activity, topStrikes };
});

export const getLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("lists")
      .select("id, name, description, created_at, list_items(id)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((l: any) => ({ ...l, item_count: l.list_items?.length ?? 0 }));
  });

export const createList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(80), description: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("lists")
      .insert({ user_id: context.userId, name: data.name, description: data.description ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const getListDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: list } = await (context.supabase as any)
      .from("lists")
      .select("id, name, description, created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!list) throw new Error("List not found");
    const { data: items } = await (context.supabase as any)
      .from("list_items")
      .select("id, status, notes, created_at, businesses(id, name, city, has_website, has_instagram, google_review_count, categories(name), localities(name), lead_scores(score, revenue_opportunity_inr))")
      .eq("list_id", data.id)
      .order("created_at", { ascending: false });
    return { ...list, items: items ?? [] };
  });

export const addToList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listId: z.string().uuid().nullable().optional(), businessId: z.string().uuid(), listName: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let listId = data.listId ?? null;
    if (!listId) {
      const { data: existing } = await (context.supabase as any)
        .from("lists")
        .select("id")
        .eq("user_id", context.userId)
        .eq("name", data.listName ?? "Hot Leads")
        .maybeSingle();
      listId = existing?.id ?? null;
      if (!listId) {
        const { data: created } = await (context.supabase as any)
          .from("lists")
          .insert({ user_id: context.userId, name: data.listName ?? "Hot Leads" })
          .select("id")
          .single();
        listId = created?.id ?? null;
      }
    }
    if (!listId) throw new Error("Could not create list");
    const { data: item, error } = await (context.supabase as any)
      .from("list_items")
      .upsert({ list_id: listId, business_id: data.businessId }, { onConflict: "list_id,business_id", ignoreDuplicates: true })
      .select("id")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return { listId, duplicate: !item };
  });

export const updateListItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      itemId: z.string().uuid(),
      status: z.enum(["New", "Contacted", "Qualified", "Converted", "Discarded"]).optional(),
      notes: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string | null> = {};
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await (context.supabase as any).from("list_items").update(patch).eq("id", data.itemId);
    if (error) throw error;
    return { ok: true };
  });

export const exportListCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const detail = await getListDetail({ data: { id: data.id } });
    const rows = [
      ["Name", "Category", "City", "Locality", "Score", "Opportunity INR", "Status", "Notes"],
      ...detail.items.map((item: any) => {
        const b = item.businesses;
        const score = Array.isArray(b?.lead_scores) ? b.lead_scores[0] : b?.lead_scores;
        return [b?.name, b?.categories?.name, b?.city, b?.localities?.name, score?.score, score?.revenue_opportunity_inr, item.status, item.notes ?? ""];
      }),
    ];
    await (context.supabase as any).from("activity_logs").insert({ user_id: context.userId, action: "export_list_csv", meta: { list_id: data.id } });
    return rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed) throw new Error("Admin access required");
    const sb = context.supabase as any;
    const [users, notifications, businesses, config] = await Promise.all([
      sb.from("profiles").select("id, email, full_name, created_at").limit(50),
      sb.from("notifications").select("id, title, body, read, created_at").order("created_at", { ascending: false }).limit(30),
      sb.from("businesses").select("id, name, city, strike_timing, pressure_signal").order("created_at", { ascending: false }).limit(30),
      sb.from("scoring_config").select("id, key, value, updated_at").limit(20),
    ]);
    return {
      users: users.data ?? [],
      notifications: notifications.data ?? [],
      businesses: businesses.data ?? [],
      config: config.data ?? [],
    };
  });
