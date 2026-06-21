import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function callGemini(prompt: string, system?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? process.env.LOVABLE_API_KEY;
  // Prefer Gemini direct when GEMINI key present; else Lovable Gateway.
  if (process.env.GEMINI_API_KEY) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
        }),
      },
    );
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
    const j: any = await r.json();
    return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
  // Lovable AI Gateway fallback
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key! },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!r.ok) throw new Error(`AI Gateway ${r.status}: ${await r.text()}`);
  const j: any = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function getBusinessForAI(supabase: any, businessId: string) {
  const { data: biz } = await supabase
    .from("businesses")
    .select("*, categories(name), localities(name, city), lead_scores(*)")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) throw new Error("Business not found");
  return biz;
}

export const generateAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("*, categories(name), localities(name), lead_scores(*)")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!biz) throw new Error("Business not found");

    const prompt = `You are a senior growth strategist at NEXORA AI. Produce a structured Growth Audit for this Hyderabad business. Return ONLY valid minified JSON matching this TypeScript type, no markdown fences:
{
  "summary": string,
  "website_audit": { "status": string, "issues": string[], "recommendations": string[] },
  "seo_audit": { "score": number, "issues": string[], "recommendations": string[] },
  "reviews_audit": { "status": string, "recommendations": string[] },
  "social_audit": { "instagram_present": boolean, "recommendations": string[] },
  "competition": { "summary": string, "threats": string[] },
  "growth_opportunities": string[],
  "recommended_services": { "name": string, "price_inr_monthly": number, "why": string }[],
  "expected_revenue_lift_inr_monthly": number
}

Business: ${JSON.stringify({
      name: biz.name,
      category: (biz as any).categories?.name,
      locality: (biz as any).localities?.name,
      has_website: biz.has_website,
      website: biz.website,
      has_instagram: biz.has_instagram,
      google_rating: biz.google_rating,
      reviews: biz.google_review_count,
      employees: biz.employee_count,
      years: biz.years_in_business,
      monthly_revenue_inr: biz.estimated_monthly_revenue_inr,
      lead_score: (biz as any).lead_scores?.score,
    })}

All currency values MUST be in Indian Rupees (₹). Be concrete and India/Hyderabad specific.`;

    const text = await callGemini(prompt, "You are an expert sales/growth analyst. Output JSON only.");
    let report: any;
    try {
      const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      report = JSON.parse(cleaned);
    } catch {
      report = { summary: text, raw: true };
    }
    await supabase.from("audits").insert({ business_id: data.businessId, generated_by: userId, report });
    return report;
  });

export const generatePressureSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const biz = await getBusinessForAI(supabase, data.businessId);
    const prompt = `Return ONLY minified JSON:
{"pressure_signal": string, "strike_timing": "NOW"|"SOON"|"WAIT", "competitor_count_nearby": number, "google_review_responses": number}

Create a one-sentence pressure signal for an agency sales rep deciding whether to call this Indian SMB today.
Business: ${JSON.stringify({
      name: biz.name,
      category: biz.categories?.name,
      locality: biz.localities?.name,
      city: biz.city ?? biz.localities?.city,
      has_website: biz.has_website,
      has_instagram: biz.has_instagram,
      rating: biz.google_rating,
      reviews: biz.google_review_count,
      current_signal: biz.pressure_signal,
      lead_score: biz.lead_scores?.score,
    })}`;
    const text = await callGemini(prompt, "You are a concise B2B sales-intelligence analyst. JSON only.");
    const fallback = {
      pressure_signal: biz.pressure_signal ?? "SOON: Digital gaps are visible enough to justify a timely consultative call.",
      strike_timing: biz.strike_timing ?? "SOON",
      competitor_count_nearby: biz.competitor_count_nearby ?? 4,
      google_review_responses: biz.google_review_responses ?? 0,
    };
    const signal = parseJson(text, fallback);
    await supabase
      .from("businesses")
      .update({
        pressure_signal: signal.pressure_signal,
        strike_timing: signal.strike_timing,
        competitor_count_nearby: signal.competitor_count_nearby,
        google_review_responses: signal.google_review_responses,
      })
      .eq("id", data.businessId);
    return signal;
  });

export const generateOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const biz = await getBusinessForAI(context.supabase as any, data.businessId);
    const prompt = `Return ONLY minified JSON matching {"email": string, "whatsapp": string}.
Write concise cold outreach for a growth agency selling websites, SEO, review recovery, and social growth. Reference the pressure signal naturally without sounding alarmist.
Business: ${JSON.stringify({
      name: biz.name,
      category: biz.categories?.name,
      locality: biz.localities?.name,
      city: biz.city ?? biz.localities?.city,
      has_website: biz.has_website,
      has_instagram: biz.has_instagram,
      rating: biz.google_rating,
      reviews: biz.google_review_count,
      pressure_signal: biz.pressure_signal,
      strike_timing: biz.strike_timing,
    })}`;
    const text = await callGemini(prompt, "You are an expert Indian SMB outbound copywriter. JSON only.");
    return parseJson(text, {
      email: `Subject: Quick growth idea for ${biz.name}\n\nHi ${biz.name} team,\n\nI noticed a clear opportunity to improve local discovery and conversion for your ${biz.categories?.name ?? "business"} in ${biz.localities?.name ?? biz.city ?? "your area"}. A sharper web and review presence could help capture more high-intent customers already searching nearby.\n\nWould you be open to a 10-minute call this week?`,
      whatsapp: `Hi, I work with local businesses on websites, SEO, reviews and social growth. I saw a timely opportunity for ${biz.name} to capture more nearby demand. Open to a quick 10-min call this week?`,
    });
  });

export const generateCopilotBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ businessId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const biz = await getBusinessForAI(supabase, data.businessId);
    const prompt = `Create a direct call briefing for a sales rep before calling this owner. Use second person. Include opener, likely objection, wedge, and one close. Keep under 220 words.
Business: ${JSON.stringify({
      name: biz.name,
      category: biz.categories?.name,
      locality: biz.localities?.name,
      city: biz.city ?? biz.localities?.city,
      has_website: biz.has_website,
      has_instagram: biz.has_instagram,
      rating: biz.google_rating,
      reviews: biz.google_review_count,
      pressure_signal: biz.pressure_signal,
      strike_timing: biz.strike_timing,
    })}`;
    const briefing = await callGemini(prompt, "You are NEXORA's cold-call coach. Be specific, useful, and terse.");
    const { data: session } = await supabase
      .from("copilot_sessions")
      .insert({ user_id: context.userId, business_id: data.businessId, briefing })
      .select("id")
      .single();
    return { sessionId: session?.id, briefing };
  });

export const copilotChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      businessId: z.string().uuid(),
      sessionId: z.string().uuid().nullable().optional(),
      message: z.string().min(1).max(2000),
      transcript: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const biz = await getBusinessForAI(supabase, data.businessId);
    const transcript = [...data.transcript, { role: "rep", content: data.message }];
    const sys = `You are roleplaying as the owner/manager of ${biz.name}, a ${biz.categories?.name ?? "local business"} in ${biz.localities?.name ?? biz.city ?? "India"}. Be realistic: busy, skeptical, but persuadable. Keep replies under 80 words. Do not break character.`;
    const prompt = transcript.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const reply = await callGemini(prompt, sys);
    const nextTranscript = [...transcript, { role: "owner", content: reply }];
    if (data.sessionId) {
      await supabase.from("copilot_sessions").update({ transcript: nextTranscript }).eq("id", data.sessionId).eq("user_id", context.userId);
    }
    return { reply, transcript: nextTranscript };
  });

export const scoreCopilotSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      sessionId: z.string().uuid().nullable().optional(),
      transcript: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const prompt = `Return ONLY minified JSON matching {"score": number, "feedback": string[], "next_steps": string[]}.
Score this cold-call roleplay for preparation, opener clarity, discovery, handling objections, and close.
Transcript: ${JSON.stringify(data.transcript)}`;
    const report = parseJson(await callGemini(prompt, "You are a strict but helpful sales call evaluator. JSON only."), {
      score: 72,
      feedback: ["Clear opener, but add one sharper business-specific reason to continue.", "Ask one discovery question before pitching the solution."],
      next_steps: ["Lead with the pressure signal.", "Close for a 10-minute audit instead of a broad meeting."],
    });
    if (data.sessionId) {
      await (context.supabase as any)
        .from("copilot_sessions")
        .update({ transcript: data.transcript, readiness_score: report.score, feedback: report })
        .eq("id", data.sessionId)
        .eq("user_id", context.userId);
    }
    return report;
  });

export const chatAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      conversationId: z.string().uuid().nullable().optional(),
      message: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let convId = data.conversationId ?? null;
    if (!convId) {
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: data.message.slice(0, 60) })
        .select("id")
        .single();
      convId = conv?.id ?? null;
    }
    if (!convId) throw new Error("Could not create conversation");

    await supabase.from("messages").insert({ conversation_id: convId, user_id: userId, role: "user", content: data.message });

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Pull top opportunity context to ground answers
    const { data: top } = await supabase
      .from("businesses")
      .select("name, has_website, has_instagram, google_review_count, categories(name), localities(name), lead_scores(score, revenue_opportunity_inr)")
      .limit(30);

    const grounding = (top ?? []).map((b: any) => ({
      name: b.name,
      cat: b.categories?.name,
      loc: b.localities?.name,
      web: b.has_website, ig: b.has_instagram, reviews: b.google_review_count,
      score: b.lead_scores?.score, opp_inr: b.lead_scores?.revenue_opportunity_inr,
    }));

    const sys = `You are the NEXORA AI Sales Copilot — a confident, action-oriented growth strategist for agencies selling to Hyderabad SMBs. Always cite specific businesses from CONTEXT when relevant. Currency is INR (₹).
CONTEXT (live data, sample of 30 leads): ${JSON.stringify(grounding)}`;

    const transcript = (history ?? []).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const reply = await callGemini(transcript || data.message, sys);

    await supabase.from("messages").insert({ conversation_id: convId, user_id: userId, role: "assistant", content: reply });
    return { conversationId: convId, reply };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const getConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msgs } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return msgs ?? [];
  });
