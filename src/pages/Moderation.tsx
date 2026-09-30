import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheckIcon, WarningIcon } from "@phosphor-icons/react";
import { api, type Report } from "../api";
import { invalidate, useQuery } from "../data";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  RowsSkeleton,
  Segments,
  Textarea,
  useToast,
} from "../design/ui";
import { formatDateTime, relativeTime } from "../format";

/**
 * Moderation.
 *
 * Reports are sorted by what they are about rather than by when they
 * arrived: a safety report and a complaint about somebody being late are not
 * the same job. Severity is carried by one badge and a quiet left edge, not
 * by turning the page red, because an interface that shouts at every row
 * stops being read.
 *
 * The reporter is named to the admin, who may need to speak to them, and
 * never to the person reported.
 */

type Status = "open" | "escalated" | "resolved";

/** Which categories are a safety matter rather than a nuisance. */
const SEVERE = new Set(["safety", "harassment", "unsafe-driving", "threat"]);

const ACTIONS = [
  { value: "dismiss", label: "Dismiss", variant: "secondary" as const, needsNote: false },
  { value: "warn", label: "Warn", variant: "secondary" as const, needsNote: true },
  { value: "suspend", label: "Suspend", variant: "danger" as const, needsNote: true },
  { value: "escalate", label: "Escalate", variant: "soft" as const, needsNote: true },
];

const EXPLANATION: Record<string, string> = {
  dismiss: "Closes the report with no action against the person reported.",
  warn: "Records a warning against them and closes the report.",
  suspend: "Signs them out and stops them being matched with anyone.",
  escalate: "Hands this to the GoSaath platform team to decide.",
};

export function Moderation() {
  const [status, setStatus] = useState<Status>("open");
  const { data, loading, error, reload } = useQuery(`reports:${status}`, () =>
    api.reports(status),
  );
  const [acting, setActing] = useState<{ report: Report; action: string } | null>(null);

  const reports = data ?? [];

  return (
    <div className="stack gap-5">
      <div>
        <h2 className="h1">Reports</h2>
        <p className="small t-2" style={{ marginTop: 2 }}>
          Raised by members about other members. The person reported is never told who filed
          the report.
        </p>
      </div>

      <Segments<Status>
        value={status}
        onChange={setStatus}
        options={[
          { value: "open", label: "Open" },
          { value: "escalated", label: "Escalated" },
          { value: "resolved", label: "Resolved" },
        ]}
      />

      {error ? <ErrorState error={error} onRetry={reload} what="reports" /> : null}
      {loading && !data ? <RowsSkeleton rows={3} /> : null}

      {data && reports.length === 0 ? (
        <EmptyState
          icon={<ShieldCheckIcon size={24} />}
          title={status === "open" ? "Nothing needs your attention" : `No ${status} reports`}
          body={
            status === "open"
              ? "No reports are open right now. New ones appear here as they are raised from the app."
              : "Nothing in this state at the moment."
          }
        />
      ) : null}

      {reports.length > 0 ? (
        <div className="stack gap-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onAct={(action) => setActing({ report, action })}
            />
          ))}
        </div>
      ) : null}

      <ActDialog
        pending={acting}
        onClose={() => setActing(null)}
        onDone={async () => {
          setActing(null);
          invalidate("reports");
          invalidate("overview");
          invalidate("activity");
          await reload();
        }}
      />
    </div>
  );
}

function ReportCard({
  report,
  onAct,
}: {
  report: Report;
  onAct: (action: string) => void;
}) {
  const severe = SEVERE.has(report.category);
  const openState = report.status === "open" || report.status === "escalated";

  return (
    <Card
      pad={false}
      style={{
        // One quiet edge rather than a red card. Enough to find the serious
        // ones while scanning, not enough to drown the page.
        borderLeft: severe ? "3px solid var(--danger)" : undefined,
        overflow: "hidden",
      }}
    >
      <div className="card-pad stack gap-3">
        <div className="between gap-3 wrap">
          <div className="row gap-2 wrap">
            {severe ? (
              <Badge tone="danger">
                <WarningIcon size={12} weight="fill" />
                Safety
              </Badge>
            ) : (
              <Badge tone="neutral">{report.category.replace(/-/g, " ")}</Badge>
            )}
            {report.status !== "open" ? <Badge tone="info">{report.status}</Badge> : null}
          </div>
          <span className="caption t-3">{relativeTime(report.createdAt)}</span>
        </div>

        <div>
          <p className="body">
            {report.reported ? (
              <>
                About{" "}
                <Link to={`/members/${report.reported.id}`} style={{ fontWeight: 600 }}>
                  {report.reported.name}
                </Link>
              </>
            ) : (
              <span style={{ fontWeight: 600 }}>About the service</span>
            )}
          </p>
          <p className="caption t-3" style={{ marginTop: 2 }}>
            Reported by {report.reporter.name} · {formatDateTime(report.createdAt)}
          </p>
        </div>

        {report.detail ? (
          <div className="card card-inset" style={{ padding: "var(--space-3) var(--space-4)" }}>
            <p className="small">{report.detail}</p>
          </div>
        ) : (
          <p className="small t-3">No further detail was given.</p>
        )}

        {openState ? (
          <div className="row gap-2 wrap" style={{ marginTop: "var(--space-1)" }}>
            {ACTIONS.filter(
              // Escalating hands a report to the platform team, so it is not
              // offered on one that is already there.
              (action) => !(action.value === "escalate" && report.status === "escalated"),
            ).map((action) => (
              <Button
                key={action.value}
                size="sm"
                variant={action.variant}
                onClick={() => onAct(action.value)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ActDialog({
  pending,
  onClose,
  onDone,
}: {
  pending: { report: Report; action: string } | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const toast = useToast();
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
      toast.show({
        tone: "success",
        title: `Report ${pending.action === "escalate" ? "escalated" : `${pending.action}ed`}`,
        body:
          pending.action === "escalate"
            ? "The GoSaath platform team will pick this up."
            : "Recorded in the audit log against your name.",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`${action?.label ?? "Act on"} this report`}
      description={(pending ? EXPLANATION[pending.action] : "") ?? ""}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant={action?.variant === "danger" ? "danger" : "primary"}
            onClick={submit}
            loading={busy}
            disabled={action?.needsNote ? note.trim().length < 3 : false}
          >
            {action?.label}
          </Button>
        </>
      }
    >
      <Field
        label={action?.needsNote ? "Note" : "Note, optional"}
        htmlFor="report-note"
        hint="Recorded in the audit log against your name."
        {...(error ? { error } : {})}
      >
        <Textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {error ? <InlineError message={error} /> : null}
    </Dialog>
  );
}
