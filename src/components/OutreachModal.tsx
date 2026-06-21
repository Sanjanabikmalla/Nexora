import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Copy, Loader2, Mail, MessageSquareText, Sparkles } from "lucide-react";
import { generateOutreach } from "@/lib/ai.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function OutreachModal({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const outreachMutation = useMutation({ mutationFn: () => generateOutreach({ data: { businessId } }) });

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next && !outreachMutation.data && !outreachMutation.isPending) outreachMutation.mutate();
    }}>
      <DialogTrigger asChild>
        <button className="btn-hero text-sm">
          <Sparkles className="h-4 w-4" />
          Generate Outreach
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl border-white/10 bg-[oklch(0.16_0.03_270)] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[oklch(0.82_0.17_210)]" />
            AI Outreach Generator
          </DialogTitle>
        </DialogHeader>
        {outreachMutation.isPending && (
          <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Drafting pressure-aware outreach...
          </div>
        )}
        {outreachMutation.isError && (
          <div className="rounded-xl border border-[oklch(0.72_0.25_350)]/30 bg-[oklch(0.72_0.25_350)]/10 p-4 text-sm">
            {(outreachMutation.error as Error).message}
          </div>
        )}
        {outreachMutation.data && (
          <div className="grid gap-4 lg:grid-cols-2">
            <DraftPanel icon={<Mail className="h-4 w-4" />} title="Cold Email" body={outreachMutation.data.email} />
            <DraftPanel icon={<MessageSquareText className="h-4 w-4" />} title="WhatsApp" body={outreachMutation.data.whatsapp} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DraftPanel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>
        <button
          onClick={() => navigator.clipboard?.writeText(body)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <pre className="max-h-[380px] whitespace-pre-wrap rounded-lg bg-black/25 p-3 text-sm leading-6 text-white/82">{body}</pre>
    </div>
  );
}
