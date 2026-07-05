import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { sdb } from "@/lib/supabase-unsafe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

import { disableDemo, isDemo } from "@/lib/demo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In - AH" },
      { name: "description", content: "Sign in to AH" },
    ],
  }),
  beforeLoad: async () => {
    if (isDemo()) {
      throw redirect({ to: "/tutor" });
    }
    // Skip auth-redirect when arriving with a recovery token in the hash —
    // the client-side effect will forward to /reset-password.
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.includes("type=recovery") || hash.includes("access_token=")) {
        return;
      }
    }
    const { data } = await sdb.auth.getUser();
    if (data.user) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  // (router available via useRouter() if needed later)
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  useEffect(() => {
    // Ensure any leftover demo flag is cleared on the sign-in page.
    if (isDemo()) disableDemo();
  }, []);


  useEffect(() => {
    // Recovery links from Supabase land at /auth#access_token=...&type=recovery.
    // Forward to /reset-password preserving the hash so supabase-js can consume it.
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      navigate({ to: "/reset-password", hash: hash.replace(/^#/, "") });
      return;
    }
    // Also listen for the event in case supabase-js fires it before the hash check resolves.
    const { data: sub } = sdb.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate({ to: "/reset-password" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const { data, error: signInError } = await sdb.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (!data.session) {
        setError("Sign-in succeeded but no session was returned. Please try again.");
        return;
      }
      // Explicit navigation — don't rely solely on side effects.
      navigate({ to: "/" });
    } catch (err: any) {
      console.error("[auth] signInWithPassword threw:", err);
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    const { error: resetError } = await sdb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setInfo("If an account exists for that email, a reset link has been sent.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">AH</h1>
          <p className="text-xs text-muted-foreground mt-1">Numeracy Learning Intelligence</p>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin" ? "Sign in to your account" : "Reset your password"}
          </p>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
              onClick={() => {
                setMode("forgot");
                setError("");
                setInfo("");
              }}
            >
              Forgot password?
            </button>

          </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-forgot">Email</Label>
              <Input
                id="email-forgot"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-[var(--status-green-fg)]">{info}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
              onClick={() => {
                setMode("signin");
                setError("");
                setInfo("");
              }}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
