import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { createList, getLists } from "@/lib/queries.functions";
import { ListChecks, Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lists")({
  component: ListsPage,
});

function ListsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const listsQuery = useQuery({ queryKey: ["lists"], queryFn: () => getLists() });
  const createMutation = useMutation({
    mutationFn: () => createList({ data: { name } }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
  const lists = listsQuery.data ?? [];

  return (
    <AppShell>
      <div className="p-6 lg:p-10 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">My Lists</div>
            <h1 className="text-4xl font-bold tracking-tight mt-1" style={{ fontFamily: "Space Grotesk" }}>Saved lead lists</h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMutation.mutate();
            }}
            className="flex gap-2"
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New list name" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
            <button className="btn-hero text-sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </form>
        </header>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lists.map((list: any) => (
            <Link key={list.id} to="/lists/$id" params={{ id: list.id }} className="glass-strong rounded-2xl p-5 transition-colors hover:border-white/18">
              <ListChecks className="mb-4 h-6 w-6 text-[oklch(0.82_0.17_210)]" />
              <div className="font-semibold">{list.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{list.description ?? "Lead workspace"}</div>
              <div className="mt-4 text-xs text-muted-foreground">{list.item_count} saved leads</div>
            </Link>
          ))}
          {!listsQuery.isLoading && lists.length === 0 && <div className="text-sm text-muted-foreground">No lists yet. Save a lead or create your first list.</div>}
        </div>
      </div>
    </AppShell>
  );
}
