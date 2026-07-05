import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sdb } from "@/lib/supabase-unsafe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const debugReset = (label: string, details?: Record<string, unknown>) => {
  console.log(`[ResetPassword] ${label}`, details ?? "");
};

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Reset Password - AH" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase parses the URL hash (#access_token=...&type=recovery) automatically
    // and emits PASSWORD_RECOVERY. Also support ?code=... PKCE flow.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");

    debugReset("route mounted", {
      href: window.location.href.replace(/access_token=[^&]+/g, "access_token=[redacted]").replace(/refresh_token=[^&]+/g, "refresh_token=[redacted]"),
      hasHash: hash.length > 0,
      hashKeys: Array.from(hashParams.keys()),
      hasAccessToken: Boolean(accessToken),
      accessTokenLength: accessToken?.length ?? 0,
      hasRefreshToken: Boolean(refreshToken),
      refreshTokenLength: refreshToken?.length ?? 0,
      type: hashType,
      isRecovery: hashType === "recovery",
      hasCode: Boolean(code),
    });

    const init = async () => {
      debugReset("init started", { hasCode: Boolean(code) });
      if (code) {
        const { error: exErr } = await sdb.auth.exchangeCodeForSession(code);
        debugReset("exchangeCodeForSession completed", {
          hasError: Boolean(exErr),
          errorMessage: exErr?.message ?? null,
          errorName: exErr?.name ?? null,
          errorStatus: (exErr as any)?.status ?? null,
        });
        if (exErr) {
          setError(exErr.message);
        } else {
          setRecovery(true);
        }
      } else {
        const { data, error: sessionErr } = await sdb.auth.getSession();
        debugReset("getSession completed", {
          hasSession: Boolean(data.session),
          userId: data.session?.user?.id ?? null,
          expiresAt: data.session?.expires_at ?? null,
          hasError: Boolean(sessionErr),
          errorMessage: sessionErr?.message ?? null,
          errorName: sessionErr?.name ?? null,
          errorStatus: (sessionErr as any)?.status ?? null,
        });
        if (sessionErr) setError(sessionErr.message);
        if (data.session) setRecovery(true);
      }
      debugReset("init finished", { ready: true });
      setReady(true);
    };

    const { data: sub } = sdb.auth.onAuthStateChange((event: string, session: any) => {
      debugReset("auth state event", {
        event,
        isPasswordRecovery: event === "PASSWORD_RECOVERY",
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
        expiresAt: session?.expires_at ?? null,
      });
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        setReady(true);
      }
    });

    init();
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: upErr } = await sdb.auth.updateUser({ password });
    setLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setSuccess(true);
    await sdb.auth.signOut();
    setTimeout(() => navigate({ to: "/auth" }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-lg font-semibold tracking-tight">AH</div>
          <div className="text-xs text-muted-foreground mb-3">Numeracy Learning Intelligence</div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a new password for your account
          </p>
        </div>

        {!ready && <p className="text-sm text-muted-foreground text-center">Loading…</p>}

        {ready && !recovery && !success && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-destructive">
              {error || "This password reset link is invalid or has expired."}
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Back to sign in
            </Button>
          </div>
        )}

        {ready && recovery && !success && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}

        {success && (
          <p className="text-sm text-center text-[var(--status-green-fg)]">
            Password updated. Redirecting to sign in…
          </p>
        )}
      </div>
    </div>
  );
}
