import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  SegmentedControl,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { WarningIcon } from "@phosphor-icons/react";
import { api, type Report } from "../api";
import { EmptyState, ErrorState, Loading, PageHeading, formatDate, useData } from "../lib";

/**
 * Reports, and what was done about them.
 *
 * The person who reported is shown to you because you may need to speak to
 * them. They are never shown to the person reported, and nothing here tells
 * the reported person who filed it.
 */

const ACTIONS = [
  { value: "dismiss", label: "Dismiss", color: "gray" as const, needsNote: false },
  { value: "warn", label: "Warn", color: "amber" as const, needsNote: true },
  { value: "suspend", label: "Suspend", color: "red" as const, needsNote: true },
  { value: "escalate", label: "Escalate", color: "indigo" as const, needsNote: true },
];

export function Reports() {
  const [status, setStatus] = useState("open");
  const { data, loading, error, reload } = useData(() => api.reports(status), [status]);
  const [acting, setActing] = useState<{ report: Report; action: string } | null>(null);

  return (
    <>
      <PageHeading
        title="Reports"
        caption="Raised by members about other members. The person reported is never told who filed it."
      />

      <SegmentedControl.Root value={status} onValueChange={setStatus} mb="4">
        <SegmentedControl.Item value="open">Open</SegmentedControl.Item>
        <SegmentedControl.Item value="escalated">Escalated</SegmentedControl.Item>
        <SegmentedControl.Item value="resolved">Resolved</SegmentedControl.Item>
      </SegmentedControl.Root>

      {loading ? <Loading /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title={status === "open" ? "No open reports" : `Nothing ${status}`}
          body="Reports raised from the app appear here for somebody to look at."
        />
      ) : null}

      {data && data.length > 0 ? (
        <Flex direction="column" gap="3">
          {data.map((report) => (
            <Card key={report.id}>
              <Box p="2">
                <Flex justify="between" align="start" gap="4" wrap="wrap">
                  <Box style={{ minWidth: 260, flexGrow: 1 }}>
                    <Flex gap="2" align="center" mb="1" wrap="wrap">
                      <Badge color="gray" variant="soft" size="1">
                        {report.category.replace(/-/g, " ")}
                      </Badge>
                      <Text size="1" color="gray">
                        {formatDate(report.createdAt)}
                      </Text>
                    </Flex>

                    <Text size="2" as="p">
                      {report.reported ? (
                        <>
                          About{" "}
                          <Link to={`/members/${report.reported.id}`}>
                            {report.reported.name}
                          </Link>
                        </>
                      ) : (
                        "About the service"
                      )}
                      <Text color="gray"> · from {report.reporter.name}</Text>
                    </Text>

                    {report.detail ? (
                      <Text size="2" color="gray" as="p" mt="2">
                        {report.detail}
                      </Text>
                    ) : null}
                  </Box>

                  {report.status === "open" || report.status === "escalated" ? (
                    <Flex gap="2" wrap="wrap">
                      {ACTIONS.filter(
                        // Escalating hands a report to the platform team, so
                        // it is not offered on one that is already there.
                        (action) =>
                          !(action.value === "escalate" && report.status === "escalated"),
                      ).map((action) => (
                        <Button
                          key={action.value}
                          size="1"
                          variant="soft"
                          color={action.color}
                          onClick={() => setActing({ report, action: action.value })}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Flex>
                  ) : (
                    <Badge color="gray" variant="soft">
                      {report.status}
                    </Badge>
                  )}
                </Flex>
              </Box>
            </Card>
          ))}
        </Flex>
      ) : null}

      <ActionDialog
        pending={acting}
        onClose={() => setActing(null)}
        onDone={async () => {
          setActing(null);
          await reload();
        }}
      />
    </>
  );
}

function ActionDialog({
  pending,
  onClose,
  onDone,
}: {
  pending: { report: Report; action: string } | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = ACTIONS.find((a) => a.value === pending?.action);

  async function submit() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await api.actOnReport(pending.report.id, pending.action, note.trim() || undefined);
      setNote("");
      await onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  const explanation: Record<string, string> = {
    dismiss: "Closes the report with no action against the person reported.",
    warn: "Records a warning against them and closes the report.",
    suspend: "Signs them out and stops them being matched with anyone.",
    escalate: "Hands this to the GoSaath platform team to decide.",
  };

  return (
    <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{action?.label} this report</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {pending ? explanation[pending.action] : ""}
        </Dialog.Description>

        <Text as="label" size="2" weight="medium" htmlFor="report-note">
          Note{action?.needsNote ? "" : ", optional"}
        </Text>
        <TextArea
          id="report-note"
          mt="1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Recorded in the audit log against your name."
        />

        {error ? (
          <Callout.Root color="red" size="1" mt="3" role="alert">
            <Callout.Icon>
              <WarningIcon size={15} />
            </Callout.Icon>
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
            {...(action ? { color: action.color } : {})}
            onClick={submit}
            loading={busy}
            disabled={action?.needsNote ? note.trim().length < 3 : false}
          >
            {action?.label}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
