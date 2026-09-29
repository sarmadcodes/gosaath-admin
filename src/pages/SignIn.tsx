import { useState } from "react";
import { Box, Button, Callout, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { WarningIcon } from "@phosphor-icons/react";
import { api, type AdminMe } from "../api";

/**
 * Sign in.
 *
 * The same credentials as the app: an admin is a member with a role, not a
 * separate account. The panel never decides who is an admin. It asks the
 * server and believes the answer.
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
    <Flex align="center" justify="center" px="4" style={{ minHeight: "100dvh" }}>
      <Box width="100%" style={{ maxWidth: 380 }}>
        <Heading size="6" mb="1">
          GoSaath Admin
        </Heading>
        <Text size="2" color="gray" as="p" mb="5">
          Sign in with your institution account.
        </Text>

        <Card size="3">
          <form onSubmit={submit}>
            <Flex direction="column" gap="4">
              <Box>
                <Text as="label" size="2" weight="medium" htmlFor="email">
                  Email
                </Text>
                <TextField.Root
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  mt="1"
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="medium" htmlFor="password">
                  Password
                </Text>
                <TextField.Root
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  mt="1"
                />
              </Box>

              {error ? (
                <Callout.Root color="red" size="1" role="alert">
                  <Callout.Icon>
                    <WarningIcon size={15} />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              ) : null}

              <Button type="submit" loading={busy} disabled={!email || !password}>
                Sign in
              </Button>
            </Flex>
          </form>
        </Card>
      </Box>
    </Flex>
  );
}
