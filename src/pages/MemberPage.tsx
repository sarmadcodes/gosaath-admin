import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Grid,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { ArrowLeftIcon, PhoneIcon, WarningIcon } from "@phosphor-icons/react";
import { api } from "../api";
import { ErrorState, Loading, PageHeading, formatDate, useData } from "../lib";
import { BadgeStatus } from "./Members";

/**
 * One member.
 *
 * Enough to answer "who is this and what have they been doing", and nothing
 * more. No commute history, no ride log, no location trail: an admin
 * moderating a report needs to identify an account, not follow somebody's
 * week.
 */
export function MemberPage() {
  const { id = "" } = useParams();
  const { data, loading, error, reload, set } = useData(() => api.member(id), [id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function restore() {
    setBusy(true);
    setActionError(null);
    try {
      await api.restoreMember(id);
      await reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" color="gray" mb="4" asChild>
        <Link to="/members">
          <ArrowLeftIcon size={15} />
          All members
        </Link>
      </Button>

      {loading ? <Loading /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <PageHeading
            title={data.name}
            caption={data.email}
            action={
              data.suspended ? (
                <Button variant="soft" onClick={restore} loading={busy}>
                  Restore access
                </Button>
              ) : (
                <SuspendButton
                  memberId={id}
                  onDone={async () => {
                    await reload();
                  }}
                />
              )
            }
          />

          {actionError ? (
            <Callout.Root color="red" mb="4" role="alert">
              <Callout.Icon>
                <WarningIcon size={16} />
              </Callout.Icon>
              <Callout.Text>{actionError}</Callout.Text>
            </Callout.Root>
          ) : null}

          {data.suspended ? (
            <Callout.Root color="red" mb="4">
              <Callout.Icon>
                <WarningIcon size={16} />
              </Callout.Icon>
              <Callout.Text>
                This account is suspended. They cannot sign in or be matched
                with anyone.
              </Callout.Text>
            </Callout.Root>
          ) : null}

          <Flex direction="column" gap="4">
            <Card>
              <Grid columns={{ initial: "2", sm: "4" }} gap="4" p="2">
                <Field label="Type" value={data.userType} />
                <Field label="Campus" value={data.campusName} />
                <Field label="Area" value={data.areaName} />
                <Field label="Joined" value={formatDate(data.joinedAt)} />
              </Grid>
              <Separator size="4" my="3" />
              <Flex gap="5" p="2" wrap="wrap" align="center">
                <Box>
                  <Text size="1" color="gray" as="p" mb="1">
                    Badge
                  </Text>
                  <BadgeStatus status={data.badgeStatus} />
                </Box>
                <Box>
                  <Text size="1" color="gray" as="p" mb="1">
                    Reports about them
                  </Text>
                  <Badge
                    color={data.reportsAgainst > 0 ? "amber" : "gray"}
                    variant="soft"
                    size="1"
                  >
                    {data.reportsAgainst}
                  </Badge>
                </Box>
              </Flex>
            </Card>

            <Card>
              <Box p="2">
                <Text size="2" weight="medium" as="p" mb="2">
                  Commute
                </Text>
                {data.commute ? (
                  <Flex gap="5" wrap="wrap">
                    <Field
                      label="Doing"
                      value={
                        data.commute.intent === "offer"
                          ? "Offering seats"
                          : data.commute.intent === "find"
                            ? "Looking for a ride"
                            : "Both"
                      }
                    />
                    <Field label="Days" value={data.commute.days.join(", ") || "None"} />
                    <Field
                      label="Seats"
                      value={
                        data.commute.seatsOffered === null
                          ? "Not offering"
                          : String(data.commute.seatsOffered)
                      }
                    />
                    <Field label="Status" value={data.commute.status} />
                  </Flex>
                ) : (
                  <Text size="2" color="gray">
                    No commute set up.
                  </Text>
                )}
              </Box>
            </Card>

            <RevealPhone memberId={id} />
          </Flex>
        </>
      ) : null}
      {/* `set` is part of the hook's contract; unused here on purpose. */}
      {void set}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text size="1" color="gray" as="p">
        {label}
      </Text>
      <Text size="2" as="p" style={{ textTransform: "capitalize" }}>
        {value}
      </Text>
    </Box>
  );
}

function SuspendButton({
  memberId,
  onDone,
}: {
  memberId: string;
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.suspendMember(memberId, reason.trim());
      setOpen(false);
      setReason("");
      await onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not suspend them.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="soft" color="red">
          Suspend
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Suspend this account</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          They are signed out immediately and stop appearing in anyone's
          matches. This can be undone.
        </Dialog.Description>

        <Text as="label" size="2" weight="medium" htmlFor="suspend-reason">
          Reason
        </Text>
        <TextArea
          id="suspend-reason"
          mt="1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Recorded in the audit log against your name."
        />

        {error ? (
          <Callout.Root color="red" size="1" mt="3" role="alert">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        ) : null}

        <Flex gap="2" justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            color="red"
            onClick={submit}
            loading={busy}
            disabled={reason.trim().length < 5}
          >
            Suspend account
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * The phone number, one person at a time, with a reason.
 *
 * The server records every reveal against the admin who asked and rate-limits
 * it deliberately. This is for reaching somebody about a safety matter, not
 * for building a contact list.
 */
function RevealPhone({ memberId }: { memberId: string }) {
  const [reason, setReason] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.revealPhone(memberId, reason.trim());
      setPhone(result.phone);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Box p="2">
        <Flex align="center" gap="2" mb="1">
          <PhoneIcon size={16} />
          <Text size="2" weight="medium">
            Phone number
          </Text>
        </Flex>
        <Text size="1" color="gray" as="p" mb="3">
          Recorded against your name with the reason you give. For reaching
          somebody about a safety matter.
        </Text>

        {phone ? (
          <Text size="4" weight="medium">
            {phone}
          </Text>
        ) : (
          <Flex gap="2" wrap="wrap" align="start">
            <TextField.Root
              placeholder="Why do you need it?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ flexGrow: 1, minWidth: 220 }}
            />
            <Button
              variant="soft"
              onClick={reveal}
              loading={busy}
              disabled={reason.trim().length < 5}
            >
              Reveal
            </Button>
          </Flex>
        )}

        {error ? (
          <Callout.Root color="red" size="1" mt="3" role="alert">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        ) : null}
      </Box>
    </Card>
  );
}
