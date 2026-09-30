import { useState } from "react";
import { api, type AdminMe } from "../api";
import { Button, Field, InlineError, Input } from "../design/ui";
import { BrandMark } from "../design/Brand";

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
          <BrandMark size={36} />
          <div>
            <h1 className="h1" style={{ fontSize: 19 }}>
              GoSaath
            </h1>
            <p className="caption t-3">Administration</p>
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
          One sign-in for everyone. What you can see and do is decided by your
          account, not by this page.
        </p>
      </div>
    </div>
  );
}
