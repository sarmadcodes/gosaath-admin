import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { api, type AdminMe } from "../api";
import { Button, Field, InlineError, Input } from "../design/ui";
import { BrandMark } from "../design/Brand";

/**
 * Sign in, by emailed code.
 *
 * No password. An admin account can read every member of an institution, and a
 * password is a credential that can be reused from a breach elsewhere, written
 * on a whiteboard, or typed into a page that looks like this one. A code sent
 * to a mailbox the institution already vouches for cannot be any of those.
 *
 * The copy on the second step is careful: the server will not confirm whether
 * an address belongs to an administrator, because that would be a way to
 * discover exactly whom to phish. So this page says "if that address has admin
 * access" rather than "we have sent you a code" — it does not know, and
 * pretending to would be the same leak with better manners.
 */
export function SignIn({ onSignedIn }: { onSignedIn: (admin: AdminMe) => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentAt, setResentAt] = useState<number | null>(null);

  const codeInput = useRef<HTMLInputElement>(null);

  // Focus follows the step, so the second field does not have to be found with
  // the mouse after the first was filled with the keyboard.
  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestCode(email);
      setStep("code");
      setResentAt(Date.now());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send a code. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await api.signInWithCode(email, code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      // Cleared on failure: the next attempt starts from an empty field rather
      // than one holding a code that has already been spent or burned.
      setCode("");
      codeInput.current?.focus();
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

        {step === "email" ? (
          <form onSubmit={requestCode} className="card card-pad stack gap-4">
            <div>
              <h2 className="h2">Sign in</h2>
              <p className="small t-2" style={{ marginTop: 2 }}>
                We will email you a six-digit code.
              </p>
            </div>

            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>

            {error ? <InlineError message={error} /> : null}

            <Button type="submit" variant="primary" loading={busy} disabled={!email}>
              Send code
            </Button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="card card-pad stack gap-4">
            <div>
              <h2 className="h2">Enter the code</h2>
              <p className="small t-2" style={{ marginTop: 2 }}>
                If <strong>{email}</strong> has admin access, a code is on its way.
                It expires in ten minutes.
              </p>
            </div>

            <Field label="Six-digit code" htmlFor="code">
              <Input
                id="code"
                ref={codeInput}
                // Not type="number": a leading zero must survive, and spinner
                // buttons are nonsense on a code.
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{
                  fontSize: 20,
                  letterSpacing: "0.3em",
                  fontVariantNumeric: "tabular-nums",
                }}
                required
              />
            </Field>

            {error ? <InlineError message={error} /> : null}

            <Button
              type="submit"
              variant="primary"
              loading={busy}
              disabled={code.length !== 6}
            >
              Sign in
            </Button>

            <div className="between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeftIcon size={14} /> Change email
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                // The server enforces a cooldown of its own and stays silent
                // inside it. Disabling the button for the same period means a
                // second tap is not swallowed with no explanation.
                disabled={busy || (resentAt !== null && Date.now() - resentAt < 60_000)}
                onClick={() => void requestCode()}
              >
                Resend
              </Button>
            </div>
          </form>
        )}

        <p className="caption t-3" style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          One sign-in for everyone. What you can see and do is decided by your
          account, not by this page.
        </p>
      </div>
    </div>
  );
}
