import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Mail } from "lucide-react";
import { NexoraEarth } from "@/components/Earth";

const HYDERABAD_LOCALITIES = [
  { name: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { name: "Hitech City", lat: 17.4435, lng: 78.3772 },
  { name: "Madhapur", lat: 17.4483, lng: 78.3915 },
  { name: "Kondapur", lat: 17.4615, lng: 78.3641 },
  { name: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { name: "Jubilee Hills", lat: 17.4239, lng: 78.4738 },
  { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
];

const FEED = [
  "Scanning Hyderabad…",
  "Identifying market gaps…",
  "Analyzing 278 businesses…",
  "Predicting conversions…",
  "Surfacing opportunities…",
  "Madhapur · 22 leads found",
  "Gachibowli · 4 hot leads",
];

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Nexora AI" },
      { name: "description", content: "Sign in to the Nexora AI intelligence platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const [feedIdx, setFeedIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFeedIdx((i) => (i + 1) % FEED.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const friendlyError = (msg: string) => {
    if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
      return "Incorrect email or password. Please try again.";
    if (msg.includes("Email not confirmed"))
      return "Please check your inbox and confirm your email before signing in.";
    if (msg.includes("User already registered"))
      return "An account with this email already exists. Try signing in instead.";
    if (msg.includes("Password should be"))
      return "Password must be at least 6 characters.";
    return msg;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        setSignupDone(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(friendlyError(err?.message ?? "Auth failed"));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectTo = (import.meta.env.VITE_SUPABASE_AUTH_REDIRECT as string) || window.location.origin + "/dashboard";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed. Make sure Google is enabled in your Supabase project.");
    } finally {
      setLoading(false);
    }
  };

  const markers = HYDERABAD_LOCALITIES.map((l, i) => ({ ...l, color: i === 0 ? "#ff4dd2" : "#00e5ff" }));

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Earth side */}
      <div className="relative h-[40vh] lg:h-screen overflow-hidden order-2 lg:order-1">
        <NexoraEarth markers={markers} className="absolute inset-0" spin={0.07} />
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg aurora-bg glow-violet flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold tracking-tight leading-none">NEXORA</div>
              <div className="text-[10px] text-muted-foreground tracking-[0.2em]">AI · INTELLIGENCE</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Every Business Is An Opportunity.</div>
        </div>
        <motion.div
          key={feedIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-8 left-6 glass-strong px-4 py-2.5 rounded-full text-xs flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.78_0.19_165)] animate-pulse" />
          {FEED[feedIdx]}
        </motion.div>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center p-6 lg:p-12 order-1 lg:order-2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md glass-strong p-8 rounded-3xl"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Welcome to</div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ fontFamily: "Space Grotesk" }}>
            Nexora Command Center
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "signin" ? "Sign in to access your live opportunity grid." : "Create an account and start scanning."}
          </p>

          {signupDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-6 text-center"
            >
              <div className="w-14 h-14 rounded-full aurora-bg glow-violet flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-lg mb-1">Check your inbox!</div>
                <div className="text-sm text-muted-foreground">
                  We sent a confirmation link to <span className="text-[oklch(0.82_0.17_210)]">{email}</span>.<br />
                  Click it to activate your account.
                </div>
              </div>
              <button
                onClick={() => { setSignupDone(false); setMode("signin"); }}
                className="text-sm text-[oklch(0.82_0.17_210)] hover:underline mt-2"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            <>
              <button
                onClick={google}
                disabled={loading}
                className="w-full btn-ghost-glow justify-center py-3 mb-4"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground my-5">
                <div className="h-px bg-white/10 flex-1" /> or with email <div className="h-px bg-white/10 flex-1" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[oklch(0.68_0.24_295)] outline-none transition-colors"
                  />
                )}
                <input
                  type="email" required placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[oklch(0.68_0.24_295)] outline-none transition-colors"
                />
                <input
                  type="password" required placeholder="Password (min 6 chars)" minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[oklch(0.68_0.24_295)] outline-none transition-colors"
                />
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[oklch(0.72_0.25_350)] bg-[oklch(0.72_0.25_350_/_0.08)] border border-[oklch(0.72_0.25_350_/_0.2)] rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.div>
                )}
                <button type="submit" disabled={loading} className="w-full btn-hero justify-center py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>New here?{" "}
                    <button onClick={() => { setMode("signup"); setError(null); }} className="text-[oklch(0.82_0.17_210)] hover:underline">Create an account</button>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <button onClick={() => { setMode("signin"); setError(null); }} className="text-[oklch(0.82_0.17_210)] hover:underline">Sign in</button>
                  </>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}