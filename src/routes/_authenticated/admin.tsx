import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getAdminOverview } from "@/lib/queries.functions";
import { Bell, Database, Settings2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const adminQuery = useQuery({ queryKey: ["admin-overview"], queryFn: () => getAdminOverview(), retry: false });
  const data = adminQuery.data as any;

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-6">
        <header>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin</div>
          <h1 className="text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>Operations panel</h1>
        </header>
        {adminQuery.isError && (
          <div className="rounded-2xl border border-[oklch(0.72_0.25_350)]/30 bg-[oklch(0.72_0.25_350)]/10 p-5 text-sm">
            {(adminQuery.error as Error).message}
          </div>
        )}
        {!adminQuery.isError && (
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSection icon={<Database className="h-4 w-4" />} title="Lead Dataset">
              {(data?.businesses ?? []).map((b: any) => (
                <Row key={b.id} left={b.name} right={`${b.city ?? "India"} · ${b.strike_timing ?? "WAIT"}`} />
              ))}
            </AdminSection>
            <AdminSection icon={<Users className="h-4 w-4" />} title="Users">
              {(data?.users ?? []).map((u: any) => (
                <Row key={u.id} left={u.full_name ?? u.email ?? u.id} right={u.email ?? "No email"} />
              ))}
            </AdminSection>
            <AdminSection icon={<Bell className="h-4 w-4" />} title="Notification Log">
              {(data?.notifications ?? []).map((n: any) => (
                <Row key={n.id} left={n.title} right={n.read ? "Read" : "Unread"} />
              ))}
            </AdminSection>
            <AdminSection icon={<Settings2 className="h-4 w-4" />} title="Scoring & Pressure Config">
              {(data?.config ?? []).length === 0 && <div className="text-sm text-muted-foreground">No config rows yet.</div>}
              {(data?.config ?? []).map((c: any) => (
                <Row key={c.id} left={c.key} right={new Date(c.updated_at).toLocaleDateString()} />
              ))}
            </AdminSection>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AdminSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-strong rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-white/8 p-2 text-[oklch(0.82_0.17_210)]">{icon}</span>
        <div className="font-semibold">{title}</div>
        <Shield className="ml-auto h-4 w-4 text-muted-foreground" />
      </div>
      <div className="max-h-[360px] space-y-2 overflow-y-auto">{children}</div>
    </section>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm">
      <span className="truncate">{left}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{right}</span>
    </div>
  );
}
