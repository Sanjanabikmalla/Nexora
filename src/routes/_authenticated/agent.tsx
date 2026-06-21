import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { chatAgent, listConversations, getConversationMessages } from "@/lib/ai.functions";
import { Bot, Send, Loader2, Plus, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentPage,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const SUGGESTIONS = [
  "Find salons in Madhapur without websites.",
  "Show me clinics most likely to buy SEO.",
  "Write an outreach email for dental clinics in Banjara Hills.",
  "Which 5 leads should I call first this week?",
];

function AgentPage() {
  const qc = useQueryClient();
  const [convId, setConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const convList = useQuery({ queryKey: ["conversations"], queryFn: () => listConversations() });
  const msgs = useQuery({
    queryKey: ["messages", convId],
    queryFn: () => getConversationMessages({ data: { conversationId: convId! } }),
    enabled: !!convId,
  });

  const send = useMutation({
    mutationFn: (text: string) => chatAgent({ data: { conversationId: convId, message: text } }),
    onSuccess: (r) => {
      setConvId(r.conversationId);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", r.conversationId] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.data, send.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || send.isPending) return;
    const text = input.trim();
    setInput("");
    send.mutate(text);
  };

  const messages = msgs.data ?? [];
  const pendingUser = send.isPending && send.variables ? [{ id: "tmp-u", role: "user" as const, content: send.variables, created_at: "" }] : [];
  const display = [...messages, ...pendingUser];

  return (
    <AppShell>
      <div className="h-screen flex">
        {/* Conversations sidebar */}
        <aside className="w-64 border-r border-white/5 p-4 flex flex-col">
          <button
            onClick={() => { setConvId(null); }}
            className="btn-hero text-sm justify-center mb-4"
          >
            <Plus className="w-4 h-4" /> New chat
          </button>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent</div>
          <div className="space-y-1 overflow-y-auto flex-1">
            {(convList.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setConvId(c.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${convId === c.id ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"}`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <header className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl aurora-bg flex items-center justify-center glow-violet">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold">Nexora Sales Copilot</div>
              <div className="text-xs text-muted-foreground">Grounded on 278 live Hyderabad leads · Gemini</div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            {display.length === 0 && !convId && (
              <div className="max-w-2xl mx-auto pt-20">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 mx-auto rounded-2xl aurora-bg glow-violet flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>How can I help you sell?</h2>
                  <p className="text-muted-foreground mt-2">Ask anything — leads, outreach, audits, strategy.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="text-left p-4 rounded-xl glass hover:border-white/20 border border-transparent transition-all text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto space-y-6">
              <AnimatePresence initial={false}>
                {display.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
                  >
                    {m.role !== "user" && (
                      <div className="w-8 h-8 rounded-lg aurora-bg shrink-0 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                    )}
                    <div
                      className={`px-4 py-2.5 max-w-[80%] ${m.role === "user" ? "rounded-2xl rounded-br-md text-[oklch(0.1_0.02_270)]" : "text-white"}`}
                      style={m.role === "user" ? { background: "linear-gradient(120deg, oklch(0.82 0.17 210), oklch(0.68 0.24 295))" } : undefined}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-li:my-0.5"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {send.isPending && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg aurora-bg shrink-0 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                    <div className="px-4 py-3 text-muted-foreground inline-flex items-center gap-2 text-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <form onSubmit={submit} className="border-t border-white/5 px-6 py-4">
            <div className="max-w-3xl mx-auto glass-strong rounded-2xl flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); } }}
                placeholder="Ask the Nexora Copilot…"
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none px-3 py-2 text-sm max-h-40"
              />
              <button
                type="submit"
                disabled={!input.trim() || send.isPending}
                className="w-10 h-10 rounded-xl aurora-bg flex items-center justify-center disabled:opacity-30 glow-violet"
              >
                {send.isPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}