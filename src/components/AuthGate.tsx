import { useState, type ReactNode } from "react";
import { signInWithPassword, useAuth } from "../lib/auth";

/**
 * Gates the app behind Supabase login when cloud mode is configured.
 * In local demo mode it renders children directly (no login needed).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === "local" || auth.status === "signed-in") {
    return <>{children}</>;
  }
  if (auth.status === "loading") {
    return <div className="screen-center muted">Loading…</div>;
  }
  return <Login />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand brand-lg">
          <span className="brand-mark">$</span>
          <span>Bebe Bucks</span>
        </div>
        <p className="muted small center">Sign in to your shared household.</p>
        <form onSubmit={submit} className="login-form">
          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="danger small">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="field-hint center">
          Accounts are created by the household in Supabase — there’s no public sign-up.
        </p>
      </div>
    </div>
  );
}
