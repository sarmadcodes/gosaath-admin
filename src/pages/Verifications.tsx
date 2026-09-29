import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Select,
  Separator,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { ArrowSquareOutIcon, WarningIcon } from "@phosphor-icons/react";
import { api, REJECTION_REASONS, type Verification } from "../api";
import { EmptyState, ErrorState, Loading, PageHeading, formatDate, useData } from "../lib";

/**
 * The verification queue.
 *
 * Oldest first, because it is a queue and people are waiting. Approving is
 * one click; rejecting asks for a reason, because "no" with no explanation
 * produces a student who reapplies with the same photo.
 *
 * The document link is short-lived and opens in a new tab rather than being
 * embedded: it is somebody's student card, and it should not sit rendered in
 * a browser tab that stays open all afternoon.
 */
export function Verifications() {
  const { data, loading, error, reload } = useData(() => api.verifications());
  const [rejecting, setRejecting] = useState<Verification | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function approve(person: Verification) {
    setBusyId(person.id);
    setActionError(null);
    try {
      await api.decideVerification(person.id, { approve: true });
      await reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Verification"
        caption="Students and staff who have sent a card to confirm they belong here."
      />

      {actionError ? (
        <Callout.Root color="red" mb="4" role="alert">
          <Callout.Icon>
            <WarningIcon size={16} />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      ) : null}

      {loading ? <Loading /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          body="New requests appear here as people apply for the verified badge."
        />
      ) : null}

      {data && data.length > 0 ? (
        <Flex direction="column" gap="3">
          {data.map((person) => (
            <Card key={person.id}>
              <Flex justify="between" align="start" gap="4" wrap="wrap" p="2">
                <Box style={{ minWidth: 220 }}>
                  <Text size="3" weight="medium" as="p">
                    {person.name}
                  </Text>
                  <Text size="2" color="gray" as="p">
                    {person.email}
                  </Text>
                  <Flex gap="2" mt="2" align="center">
                    <Badge variant="soft" color="gray">
                      {person.userType}
                    </Badge>
                    <Text size="1" color="gray">
                      {person.campusName} · applied {formatDate(person.requestedAt)}
                    </Text>
                  </Flex>
                </Box>

                <Flex gap="2" align="center" wrap="wrap">
                  {person.documentUrl ? (
                    <Button variant="soft" asChild>
                      <a
                        href={person.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowSquareOutIcon size={15} />
                        Open card
                      </a>
                    </Button>
                  ) : (
                    <Text size="1" color="red">
                      No document
                    </Text>
                  )}
                  <Button
                    variant="soft"
                    color="red"
                    onClick={() => setRejecting(person)}
                    disabled={busyId !== null}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => approve(person)}
                    loading={busyId === person.id}
                    disabled={busyId !== null}
                  >
                    Approve
                  </Button>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      ) : null}

      <RejectDialog
        person={rejecting}
        onClose={() => setRejecting(null)}
        onDone={async () => {
          setRejecting(null);
          await reload();
        }}
      />
    </>
  );
}

function RejectDialog({
  person,
  onClose,
  onDone,
}: {
  person: Verification | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0].value);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      await api.decideVerification(person.id, {
        approve: false,
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNote("");
      await onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={person !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Reject this request</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {person?.name} is told the reason, so they know what to fix before
          applying again.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text as="label" size="2" weight="medium" htmlFor="reason">
              Reason
            </Text>
            <Select.Root value={reason} onValueChange={setReason}>
              <Select.Trigger id="reason" mt="1" style={{ width: "100%" }} />
              <Select.Content>
                {REJECTION_REASONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Box>

          <Box>
            <Text as="label" size="2" weight="medium" htmlFor="note">
              Note, optional
            </Text>
            <TextArea
              id="note"
              mt="1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything specific that would help them get it right next time."
            />
          </Box>

          {error ? (
            <Callout.Root color="red" size="1" role="alert">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          ) : null}
        </Flex>

        <Separator size="4" my="4" />

        <Flex gap="2" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button color="red" onClick={submit} loading={busy}>
            Reject request
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
