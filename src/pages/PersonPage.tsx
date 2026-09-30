import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeftIcon,
  EyeIcon,
  LockKeyIcon,
  PhoneIcon,
  ProhibitIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api } from "../api";
import { invalidate, useQuery } from "../data";
import {
  Avatar,
  Badge,
  BadgeStatus,
  Button,
  Card,
  Dialog,
  DialogClose,
  ErrorState,
  Field,
  InlineError,
  Skeleton,
  Textarea,
  useToast,
} from "../design/ui";
import { formatDate } from "../format";

/**
 * One person.
 *
 * Enough to answer "who is this and what have they been doing", and nothing
 * more. No ride history, no location trail: an admin handling a report needs
 * to identify an account, not follow somebody's week.
 */
export function PersonPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useQuery(`member:${id}`, () => api.member(id));
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function restore() {
    setBusy(true);
    setActionError(null);
    try {
      await api.restoreMember(id);
      invalidate("member");
      invalidate("overview");
      await reload();
      toast.show({ tone: "success", title: "Access restored", body: `${data?.name} can sign in again.` });
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-5">
      <Link to="/members" className="row gap-2 small t-2" style={{ textDecoration: "none", width: "fit-content" }}>
        <ArrowLeftIcon size={15} />
        People
      </Link>

      {error ? <ErrorState error={error} onRetry={reload} what="this person" /> : null}
      {loading && !data ? <PersonSkeleton /> : null}

      {data ? (
        <>
          <div className="between gap-4 wrap">
            <div className="row gap-4">
              <Avatar name={data.name} large />
              <div>
                <h2 className="h1">{data.name}</h2>
                <p className="small t-2">{data.email}</p>
                <div className="row gap-2 wrap" style={{ marginTop: "var(--space-2)" }}>
                  <BadgeStatus status={data.badgeStatus} />
                  <Badge tone="neutral">{data.campusName}</Badge>
                  {data.suspended ? <Badge tone="danger">Suspended</Badge> : null}
                </div>
              </div>
            </div>

            <div className="row gap-2">
              {data.suspended ? (
                <Button variant="soft" onClick={restore} loading={busy}>
                  Restore access
                </Button>
              ) : (
                <SuspendAction
                  memberId={id}
                  name={data.name}
                  onDone={async () => {
                    invalidate("member");
                    invalidate("overview");
                    await reload();
                  }}
                />
              )}
            </div>
          </div>

          {actionError ? <InlineError message={actionError} /> : null}

          {data.suspended ? (
            <div
              className="row gap-3"
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <WarningIcon size={17} weight="fill" />
              <p className="small">
                This account is suspended. They cannot sign in, and they do not appear in
                anybody's matches.
              </p>
            </div>
          ) : null}

          <Tabs.Root defaultValue="overview">
            <Tabs.List className="tabs">
              <Tabs.Trigger className="tab" value="overview">
                Overview
              </Tabs.Trigger>
              <Tabs.Trigger className="tab" value="commute">
                Commute
              </Tabs.Trigger>
              <Tabs.Trigger className="tab" value="contact">
                Contact
              </Tabs.Trigger>
            </Tabs.List>

            <div style={{ paddingTop: "var(--space-5)" }}>
              <Tabs.Content value="overview">
                <Card pad={false}>
                  <div className="rows">
                    <Detail label="Account type" value={data.userType} />
                    <Detail label="Campus" value={data.campusName} />
                    <Detail label="Travels from" value={data.areaName} />
                    <Detail label="Joined" value={formatDate(data.joinedAt)} />
                    <Detail
                      label="Reports about them"
                      value={data.reportsAgainst === 0 ? "None" : String(data.reportsAgainst)}
                      {...(data.reportsAgainst > 0 ? { tone: "warning" as const } : {})}
                    />
                  </div>
                </Card>
              </Tabs.Content>

              <Tabs.Content value="commute">
                {data.commute ? (
                  <Card pad={false}>
                    <div className="rows">
                      <Detail
                        label="What they do"
                        value={
                          data.commute.intent === "offer"
                            ? "Offers seats"
                            : data.commute.intent === "find"
                              ? "Looking for a ride"
                              : "Offers seats and looks for rides"
                        }
                      />
                      <Detail label="Days" value={data.commute.days.join(", ") || "None set"} />
                      <Detail
                        label="Seats offered"
                        value={
                          data.commute.seatsOffered === null
                            ? "Not offering seats"
                            : String(data.commute.seatsOffered)
                        }
                      />
                      <Detail label="Status" value={data.commute.status} />
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <p className="small t-2">
                      They have not set up a commute. Until they do, they are not matched with
                      anyone.
                    </p>
                  </Card>
                )}
              </Tabs.Content>

              <Tabs.Content value="contact">
                <RevealPhone memberId={id} name={data.name} />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </>
      ) : null}
    </div>
  );
}

function Detail({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning";
}) {
  return (
    <div className="row-item">
      <span className="small t-2 grow">{label}</span>
      <span
        className="body"
        style={{ textTransform: "capitalize", color: tone === "warning" ? "var(--warning)" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function SuspendAction({
  memberId,
  name,
  onDone,
}: {
  memberId: string;
  name: string;
  onDone: () => Promise<void>;
}) {
  const toast = useToast();
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
      toast.show({
        tone: "success",
        title: `${name} has been suspended`,
        body: "They are signed out and no longer appear in anybody's matches.",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not suspend them.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="danger" icon={<ProhibitIcon size={15} />} onClick={() => setOpen(true)}>
        Suspend
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Suspend ${name}?`}
        description="They are signed out immediately and stop appearing in anybody's matches. You can undo this."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="danger" onClick={submit} loading={busy} disabled={reason.trim().length < 5}>
              Suspend account
            </Button>
          </>
        }
      >
        <Field
          label="Why are you suspending them?"
          htmlFor="suspend-reason"
          hint="Recorded in the audit log against your name."
          {...(error ? { error } : {})}
        >
          <Textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="A short, factual reason."
          />
        </Field>
      </Dialog>
    </>
  );
}

/**
 * The phone number, one person at a time, with a reason.
 *
 * Designed to feel like what it is rather than like a button that prints a
 * number: the number is not on the page, asking for it is a deliberate step,
 * and the panel says plainly that the request is recorded before it is made.
 */
function RevealPhone({ memberId, name }: { memberId: string; name: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setReason("");
      toast.show({
        tone: "success",
        title: "Number revealed",
        body: "This has been recorded in the audit log against your name.",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="row gap-3">
        <span
          className="row"
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--surface-2)",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LockKeyIcon size={18} color="var(--text-2)" />
        </span>

        <div className="grow">
          <p className="h3">Phone number</p>
          <p className="small t-2" style={{ marginTop: 2, maxWidth: 460 }}>
            GoSaath shares numbers between two people only once they have agreed to share a
            ride. An admin can reveal one for a safety matter, with a reason, recorded against
            your name.
          </p>

          {phone ? (
            <div className="row gap-3" style={{ marginTop: "var(--space-4)" }}>
              <PhoneIcon size={18} color="var(--brand)" />
              <a className="h2" href={`tel:${phone.replace(/\s/g, "")}`}>
                {phone}
              </a>
            </div>
          ) : (
            <Button
              variant="secondary"
              icon={<EyeIcon size={15} />}
              onClick={() => setOpen(true)}
              style={{ marginTop: "var(--space-4)" }}
            >
              Reveal phone number
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Reveal ${name}'s number?`}
        description="This is recorded in the audit log with your name, the reason you give, and the time."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={reveal} loading={busy} disabled={reason.trim().length < 5} variant="primary">
              Reveal number
            </Button>
          </>
        }
      >
        <Field
          label="Why do you need it?"
          htmlFor="reveal-reason"
          hint="For example: following up a safety report about a shared ride."
          {...(error ? { error } : {})}
        >
          <Textarea
            id="reveal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Dialog>
    </Card>
  );
}

function PersonSkeleton() {
  return (
    <div className="stack gap-5">
      <div className="row gap-4">
        <Skeleton width={56} height={56} radius="var(--radius-full)" />
        <div className="stack gap-2">
          <Skeleton width={180} height={22} />
          <Skeleton width={220} height={13} />
        </div>
      </div>
      <Skeleton width="100%" height={200} radius="var(--radius-lg)" />
    </div>
  );
}
