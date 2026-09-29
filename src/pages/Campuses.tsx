import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Switch,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, WarningIcon } from "@phosphor-icons/react";
import { api, ApiError, type Campus } from "../api";
import { EmptyState, ErrorState, Loading, PageHeading, useData } from "../lib";

/**
 * Campuses.
 *
 * Small on purpose. A campus is the thing people are matched within, so the
 * only real risk here is deactivating one that has members on it: the server
 * refuses unless it is confirmed, and returns the count so this screen can
 * say exactly how many people it would affect before anyone commits.
 */
export function Campuses() {
  const { data, loading, error, reload } = useData(() => api.campuses());
  const [confirming, setConfirming] = useState<{ campus: Campus; affected: number } | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setActive(campus: Campus, active: boolean, confirm = false) {
    setBusyId(campus.id);
    setActionError(null);
    try {
      await api.updateCampus(campus.id, { active, ...(confirm ? { confirm } : {}) });
      setConfirming(null);
      await reload();
    } catch (caught) {
      // The server answers with the number of people affected rather than a
      // flat refusal, so the question can be asked properly.
      const affected =
        caught instanceof ApiError ? Number(caught.details?.["affectedMembers"] ?? 0) : 0;
      if (affected > 0) setConfirming({ campus, affected });
      else setActionError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Campuses"
        caption="People are matched with others travelling to the same campus."
        action={<NewCampus onDone={reload} />}
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
          title="No campuses yet"
          body="Add the campuses people travel to. They pick one when they register."
        />
      ) : null}

      {data && data.length > 0 ? (
        <Flex direction="column" gap="2">
          {data.map((campus) => (
            <Card key={campus.id}>
              <Flex justify="between" align="center" gap="4" p="2" wrap="wrap">
                <Box>
                  <Flex align="center" gap="2">
                    <Text size="3" weight="medium">
                      {campus.name}
                    </Text>
                    {!campus.active ? (
                      <Badge color="gray" variant="soft" size="1">
                        Inactive
                      </Badge>
                    ) : null}
                  </Flex>
                  <Text size="1" color="gray">
                    {campus.areaName ?? "No area set"} · {campus.members}{" "}
                    {campus.members === 1 ? "member" : "members"}
                  </Text>
                </Box>

                <Flex align="center" gap="2">
                  <Text size="1" color="gray">
                    {campus.active ? "Open to new members" : "Closed"}
                  </Text>
                  <Switch
                    checked={campus.active}
                    disabled={busyId === campus.id}
                    onCheckedChange={(next) => setActive(campus, next)}
                  />
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      ) : null}

      <Dialog.Root
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Deactivate this campus?</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            {confirming?.affected}{" "}
            {confirming?.affected === 1 ? "person is" : "people are"} attached to{" "}
            {confirming?.campus.name}. They keep their account, but nobody new
            can pick this campus.
          </Dialog.Description>

          <Flex gap="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Keep it open
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={() => confirming && setActive(confirming.campus, false, true)}
              loading={busyId !== null}
            >
              Deactivate
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

function NewCampus({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.createCampus(name.trim());
      setName("");
      setOpen(false);
      await onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add it.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="soft">
          <PlusIcon size={15} />
          Add campus
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Add a campus</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Use the name people would recognise, as it appears on signs.
        </Dialog.Description>

        <Text as="label" size="2" weight="medium" htmlFor="campus-name">
          Name
        </Text>
        <TextField.Root
          id="campus-name"
          mt="1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Clifton Campus"
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
          <Button onClick={submit} loading={busy} disabled={name.trim().length < 2}>
            Add campus
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
