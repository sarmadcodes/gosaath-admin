import { useState } from "react";
import { api, type AdminMe } from "../api";
import { Button, Field, InlineError, Input } from "../design/ui";

/**
 * Sign in.
 *
 * The same credentials as the app: an administrator is a member with a role,
 * not a separate kind of account. The panel never decides who is an admin.
 * It asks the server and believes the answer.
 */
export function SignIn({ onSignedIn }: { onSignedIn: (admin: AdminMe) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await api.signIn(email.trim(), password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="row gap-3" style={{ marginBottom: "var(--space-6)" }}>
          <svg width="34" height="34" viewBox="0 0 26 26" fill="none" aria-hidden>
            <rect width="26" height="26" rx="8" fill="var(--brand)" />
            <path
              d="M7 17.5c2.2 0 2.2-9 4.5-9s2.3 9 4.5 9"
              stroke="var(--on-brand)"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <circle cx="18.6" cy="9.4" r="1.7" fill="var(--on-brand)" />
          </svg>
          <div>
            <h1 className="h1" style={{ fontSize: 19 }}>
              GoSaath Admin
            </h1>
            <p className="caption t-3">Manage commuting at your institution</p>
          </div>
        </div>

        <form onSubmit={submit} className="card card-pad stack gap-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error ? <InlineError message={error} /> : null}

          <Button type="submit" variant="primary" loading={busy} disabled={!email || !password}>
            Sign in
          </Button>
        </form>

        <p className="caption t-3" style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          Use your institution account. Access is granted by the GoSaath team.
        </p>
      </div>
    </div>
  );
}
