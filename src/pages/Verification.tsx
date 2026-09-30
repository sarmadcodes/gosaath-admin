import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowsOutIcon,
  CheckIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SealCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import { api, REJECTION_REASONS, type Verification as Request } from "../api";
import { invalidate, useQuery } from "../data";
import {
  Avatar,
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
  Textarea,
  useToast,
} from "../design/ui";
import { formatDateTime, relativeTime } from "../format";

/**
 * Verification, as a review workspace rather than a list with two buttons.
 *
 * The document is the work, so it gets the room: a viewer on the left with
 * zoom, rotate and fit, and the person's details and the decision on the
 * right. Selecting the next request keeps the viewer in place, because a
 * reviewer works through a queue rather than opening one page at a time.
 *
 * The document URL is signed and expires. It is never rendered as a link
 * somebody can copy out of the page, and it is not the storage path.
 */
export function Verification() {
  const toast = useToast();
  const { data, loading, error, reload } = useQuery("verifications", () => api.verifications());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queue = data ?? [];
  const selected = queue.find((r) => r.id === selectedId) ?? queue[0];

  async function decide(person: Request, approve: boolean, reason?: string, note?: string) {
    setBusy(true);
    setActionError(null);
    try {
      await api.decideVerification(person.id, {
        approve,
        ...(reason ? { reason } : {}),
        ...(note ? { note } : {}),
      });
      setRejecting(null);
      // Move to the next one rather than dropping the reviewer back to an
      // empty pane: this is a queue and they are working through it.
      const next = queue.find((r) => r.id !== person.id);
      setSelectedId(next?.id ?? null);
      invalidate("verifications");
      invalidate("overview");
      invalidate("activity");
      await reload();
      toast.show({
        tone: "success",
        title: approve ? "Verification approved" : "Verification rejected",
        body: approve
          ? `${person.name} is now verified.`
          : `${person.name} has been told what to fix.`,
      });
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-5">
      <div className="between gap-4 wrap">
        <div>
          <h2 className="h1">Verification</h2>
          <p className="small t-2" style={{ marginTop: 2 }}>
            Students and staff who have sent a card to confirm they belong here.
          </p>
        </div>
        {queue.length > 0 ? (
          <Badge tone="warning">
            {queue.length} {queue.length === 1 ? "waiting" : "waiting"}
          </Badge>
        ) : null}
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="the queue" /> : null}
      {loading && !data ? <RowsSkeleton rows={4} /> : null}
      {actionError ? <InlineError message={actionError} /> : null}

      {data && queue.length === 0 ? (
        <EmptyState
          icon={<SealCheckIcon size={24} />}
          title="You are all caught up"
          body="No verification requests are waiting. New ones appear here as people apply for the badge."
        />
      ) : null}

      {queue.length > 0 && selected ? (
        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            gridTemplateColumns: "minmax(0, 260px) minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          {/* The queue, kept visible so the reviewer knows what is left. */}
          <Card pad={false} style={{ overflow: "hidden" }}>
            <div className="rows">
              {queue.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="row-item row-link"
                  onClick={() => setSelectedId(person.id)}
                  style={
                    person.id === selected.id
                      ? { background: "var(--brand-soft)" }
                      : undefined
                  }
                  aria-current={person.id === selected.id}
                >
                  <Avatar name={person.name} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <p className="h3 truncate">{person.name}</p>
                    <p className="caption t-3 truncate">
                      {person.requestedAt ? relativeTime(person.requestedAt) : "Recently"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <ReviewPane
            person={selected}
            busy={busy}
            onApprove={() => decide(selected, true)}
            onReject={() => setRejecting(selected)}
          />
        </div>
      ) : null}

      <RejectDialog
        person={rejecting}
        busy={busy}
        onClose={() => setRejecting(null)}
        onSubmit={(reason, note) => rejecting && decide(rejecting, false, reason, note)}
      />
    </div>
  );
}

function ReviewPane({
  person,
  busy,
  onApprove,
  onReject,
}: {
  person: Request;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-4)",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 300px)",
        alignItems: "start",
      }}
    >
      <DocumentViewer url={person.documentUrl} key={person.id} />

      <Card className="stack gap-4">
        <div>
          <h3 className="h2">{person.name}</h3>
          <p className="small t-2">{person.email}</p>
        </div>

        <div className="stack gap-2">
          <Row label="Account type" value={person.userType} />
          <Row label="Campus" value={person.campusName} />
          <Row
            label="Applied"
            value={person.requestedAt ? formatDateTime(person.requestedAt) : "Unknown"}
          />
        </div>

        <p className="caption t-3">
          Check the card shows this name, this institution, and that it has not expired.
        </p>

        <div className="stack gap-2">
          <Button variant="primary" onClick={onApprove} loading={busy} icon={<CheckIcon size={15} />}>
            Approve verification
          </Button>
          <Button variant="danger" onClick={onReject} disabled={busy} icon={<XIcon size={15} />}>
            Reject
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="between gap-3">
      <span className="small t-2">{label}</span>
      <span className="small" style={{ textTransform: "capitalize" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * The document, with the controls a reviewer actually reaches for.
 *
 * Zoom and rotate because a student card is photographed by hand, often
 * sideways and rarely square. Keyboard shortcuts because somebody working a
 * queue of forty should not be dragging a mouse to a button each time.
 */
function DocumentViewer({ url }: { url: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  const zoomIn = useCallback(() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2))), []);
  const fit = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Not while somebody is typing a rejection reason.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (event.key === "+" || event.key === "=") zoomIn();
      else if (event.key === "-") zoomOut();
      else if (event.key.toLowerCase() === "r") setRotation((r) => (r + 90) % 360);
      else if (event.key === "0") fit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, fit]);

  const isPdf = url?.includes(".pdf") ?? false;

  return (
    <Card pad={false} style={{ overflow: "hidden" }}>
      <div
        className="between gap-2"
        style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border-soft)" }}
      >
        <span className="caption t-3">Identity document</span>
        <div className="row gap-1">
          <Button size="icon" variant="ghost" onClick={zoomOut} aria-label="Zoom out (minus key)">
            <MagnifyingGlassMinusIcon size={16} />
          </Button>
          <span className="caption t-3 numeric" style={{ width: 38, textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button size="icon" variant="ghost" onClick={zoomIn} aria-label="Zoom in (plus key)">
            <MagnifyingGlassPlusIcon size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate (R key)"
          >
            <ArrowClockwiseIcon size={16} />
          </Button>
          <Button size="icon" variant="ghost" onClick={fit} aria-label="Fit to screen (0 key)">
            <ArrowsOutIcon size={16} />
          </Button>
        </div>
      </div>

      <div
        style={{
          height: "min(62vh, 560px)",
          background: "var(--surface-sunken)",
          display: "grid",
          placeItems: "center",
          overflow: "auto",
          padding: "var(--space-4)",
        }}
      >
        {!url ? (
          <p className="small t-2" style={{ textAlign: "center", maxWidth: 260 }}>
            No document was attached to this request. Reject it and ask them to send the card
            again.
          </p>
        ) : isPdf ? (
          <object
            data={url}
            type="application/pdf"
            style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)" }}
            aria-label="Identity document"
          >
            <p className="small t-2">This PDF cannot be shown here.</p>
          </object>
        ) : (
          <>
            {state === "loading" ? <p className="small t-3">Loading the document…</p> : null}
            {state === "failed" ? (
              <p className="small t-2" style={{ textAlign: "center", maxWidth: 300 }}>
                This document could not be displayed. The link may have expired, so
                refreshing the page is worth trying first. If it still fails, the file
                itself is damaged and they should send it again.
              </p>
            ) : null}
            <img
              src={url}
              alt="Identity document submitted for verification"
              onLoad={() => setState("ready")}
              onError={() => setState("failed")}
              style={{
                display: state === "ready" ? "block" : "none",
                maxWidth: "100%",
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center",
                transition: "transform var(--normal) var(--ease)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </>
        )}
      </div>

      <p className="caption t-3" style={{ padding: "var(--space-2) var(--space-3)" }}>
        Zoom with + and -, rotate with R, reset with 0. This link expires shortly.
      </p>
    </Card>
  );
}

function RejectDialog({
  person,
  busy,
  onClose,
  onSubmit,
}: {
  person: Request | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0].value);
  const [note, setNote] = useState("");

  return (
    <Dialog
      open={person !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Reject this request"
      description={`${person?.name ?? "They"} is told the reason, so they know what to fix before applying again.`}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="danger" loading={busy} onClick={() => onSubmit(reason, note.trim())}>
            Reject request
          </Button>
        </>
      }
    >
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="h3" style={{ marginBottom: "var(--space-2)" }}>
          Reason
        </legend>
        <div className="stack gap-1">
          {REJECTION_REASONS.map((option) => (
            <label
              key={option.value}
              className="row gap-3"
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                background: reason === option.value ? "var(--brand-soft)" : "transparent",
              }}
            >
              <input
                type="radio"
                name="rejection-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                style={{ accentColor: "var(--brand)" }}
              />
              <span className="small">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Anything else they should know"
        htmlFor="reject-note"
        hint="Optional. Sent to them with the reason."
      >
        <Textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Dialog>
  );
}
