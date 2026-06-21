import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { copilotChat, generateCopilotBriefing, scoreCopilotSession } from "@/lib/ai.functions";
import { getBusinessDetail } from "@/lib/queries.functions";
import { ArrowLeft, Bot, Loader2, Send, Trophy } from "lucide-react";

type ChatLine = { role: string; content: string };

export const Route = createFileRoute("/_authenticated/copilot/$id")({
  component: CopilotRoom,
});

function CopilotRoom() {
  const { id } = useParams({ from: "/_authenticated/copilot/$id" });
  const businessQuery = useQuery({ queryKey: ["biz", id], queryFn: () => getBusinessDetail({ data: { id } }) });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ChatLine[]>([]);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<any | null>(null);

  const briefingMutation = useMutation({
    mutationFn: () => generateCopilotBriefing({ data: { businessId: id } }),
    onSuccess: (data) => setSessionId(data.sessionId ?? null),
  });
  const chatMutation = useMutation({
    mutationFn: (text: string) => copilotChat({ data: { businessId: id, sessionId, message: text, transcript } }),
    onSuccess: (data) => setTranscript(data.transcript),
  });
  const scoreMutation = useMutation({
    mutationFn: () => scoreCopilotSession({ data: { sessionId, transcript } }),
    onSuccess: setReport,
  });

  useEffect(() => {
    if (!briefingMutation.data && !briefingMutation.isPending) briefingMutation.mutate();
  }, []);

  const briefing = briefingMutation.data?.briefing ?? "";
  const typewriter = useTypewriter(briefing, 12);
  const b = businessQuery.data as any;

  return (
    <AppShell>
      <div className="min-h-screen bg-black/20 p-6 lg:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/business/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to business
          </Link>
          <button onClick={() => scoreMutation.mutate()} disabled={transcript.length < 2 || scoreMutation.isPending} className="btn-hero text-sm disabled:opacity-50">
            {scoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            End roleplay
          </button>
        </div>
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.8fr]">
          <section className="glass-strong rounded-2xl p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase 1 · Briefing</div>
            <h1 className="mt-2 text-2xl font-bold" style={{ fontFamily: "Space Grotesk" }}>{b?.name ?? "Lead"}</h1>
            <div className="mt-4 min-h-[360px] whitespace-pre-wrap font-mono text-sm leading-6 text-white/82">
              {briefingMutation.isPending ? "Preparing call intelligence..." : typewriter}
            </div>
          </section>
          <section className="glass-strong rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase 2 · Owner Roleplay</div>
                <div className="mt-1 text-sm text-muted-foreground">AI responds as the business owner.</div>
              </div>
              <Bot className="h-5 w-5 text-[oklch(0.82_0.17_210)]" />
            </div>
            <div className="h-[440px] space-y-3 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-4">
              {transcript.length === 0 && <div className="text-sm text-muted-foreground">Start with your opener.</div>}
              {transcript.map((line, i) => (
                <div key={i} className={`max-w-[85%] rounded-xl p-3 text-sm ${line.role === "rep" ? "ml-auto bg-white text-black" : "bg-white/8 text-white"}`}>
                  <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">{line.role === "rep" ? "You" : "Owner"}</div>
                  {line.content}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!message.trim()) return;
                const text = message.trim();
                setMessage("");
                chatMutation.mutate(text);
              }}
              className="mt-4 flex gap-2"
            >
              <input value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[oklch(0.82_0.17_210)]" placeholder="Say your opener..." />
              <button className="rounded-xl bg-white px-3 py-2 text-black" disabled={chatMutation.isPending}>
                {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </section>
          <section className="glass-strong rounded-2xl p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phase 3 · Readiness</div>
            {!report && <div className="mt-4 text-sm text-muted-foreground">Finish the roleplay to generate a score and feedback.</div>}
            {report && <Readiness report={report} />}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function useTypewriter(text: string, speed = 10) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const timer = window.setInterval(() => setN((v) => Math.min(text.length, v + speed)), 35);
    return () => window.clearInterval(timer);
  }, [text, speed]);
  return useMemo(() => text.slice(0, n), [text, n]);
}

function Readiness({ report }: { report: any }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Score</div>
        <div className="mt-1 text-6xl font-bold aurora-text" style={{ fontFamily: "Space Grotesk" }}>{report.score}</div>
      </div>
      <List title="Feedback" items={report.feedback ?? []} />
      <List title="Next steps" items={report.next_steps ?? []} />
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {items.map((item, i) => <div key={i} className="rounded-lg bg-white/5 p-3 text-sm">{item}</div>)}
      </div>
    </div>
  );
}
