import { useEffect, useState } from "react";
import { BuildingsIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { api } from "../../api";
import { invalidate, useQuery } from "../../data";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  EmptyState,
  ErrorState,
  Field,
  Input,
  RowsSkeleton,
  Segments,
  Textarea,
  useToast,
} from "../../design/ui";
import { formatDate } from "../../format";

/**
 * Institutions, as the platform manages them.
 *
 * Activation is the consequential act here: it decides whether students at a
 * university can register at all. Both directions ask for the administrator's
 * own password again, which the server enforces — this is one of the few
 * places where being signed in is not enough on its own.
 */

type Filter = "all" | "active" | "inactive";

export function Institutions() {
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed.trim()), 250);
    return () => clearTimeout(timer);
  }, [typed]);

  const { data, loading, error, reload } = useQuery(
    `institutions:${query}:${filter}`,
    () =>
      api.institutions({
        ...(query ? { q: query } : {}),
        ...(filter === "all" ? {} : { active: filter === "active" ? "true" : "false" }),
      }),
  );

  const institutions = data ?? [];

  return (
    <div className="stack gap-5">
      <div className="between gap-4 wrap">
        <div>
          <h2 className="h1">Institutions</h2>
          <p className="small t-2" style={{ marginTop: 2 }}>
            Every university and college on GoSaath, live or not yet open.
          </p>
        </div>
        <Input
          type="search"
          placeholder="Search institutions"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          icon={<MagnifyingGlassIcon size={15} />}
          aria-label="Search institutions"
          style={{ width: 260 }}
        />
      </div>

      <div className="between gap-3 wrap">
        <Segments<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Live" },
            { value: "inactive", label: "Not live" },
          ]}
        />
        {data ? (
          <p className="caption t-3 numeric">
            {institutions.length} {institutions.length === 1 ? "institution" : "institutions"}
          </p>
        ) : null}
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="institutions" /> : null}
      {loading && !data ? <RowsSkeleton rows={4} /> : null}

      {data && institutions.length === 0 ? (
        <EmptyState
          icon={<BuildingsIcon size={24} />}
          title={query ? "Nothing matches that" : "No institutions yet"}
          body={
            query
              ? "Try part of the name, or clear the search."
              : "Institutions are added here before their students can register."
          }
        />
      ) : null}

      {institutions.length > 0 ? (
        <Card pad={false} style={{ overflow: "hidden" }}>
          <div className="rows">
            {institutions.map((institution) => (
              <div className="row-item" key={institution.id}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row gap-2">
                    <span className="h3 truncate">
                      {institution.shortName ?? institution.name}
                    </span>
                    {institution.active ? (
                      <Badge tone="success">Live</Badge>
                    ) : (
                      <Badge tone="neutral">Not live</Badge>
                    )}
                  </div>
                  <span className="caption t-3 truncate">
                    {institution.city} · {institution.type} · added{" "}
                    {formatDate(institution.createdAt)}
                  </span>
                </div>

                <span className="small t-2 numeric hide-narrow" style={{ width: 104 }}>
                  {institution.members} {institution.members === 1 ? "member" : "members"}
                </span>
                <span className="small t-2 numeric hide-narrow" style={{ width: 96 }}>
                  {institution.campuses} {institution.campuses === 1 ? "campus" : "campuses"}
                </span>

                <ActivationAction institution={institution} onDone={reload} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ActivationAction({
  institution,
  onDone,
}: {
  institution: { id: string; name: string; shortName: string | null; active: boolean };
  onDone: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = institution.shortName ?? institution.name;
  const goingLive = !institution.active;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (goingLive) await api.activateInstitution(institution.id, password);
      else await api.deactivateInstitution(institution.id, password, reason.trim());

      setOpen(false);
      setPassword("");
      setReason("");
      invalidate("institutions");
      invalidate("platform:overview");
      onDone();
      toast.show({
        tone: "success",
        title: goingLive ? `${name} is live` : `${name} is closed`,
        body: goingLive
          ? "Students there can register and be matched."
          : "Nobody new can register there. Existing members keep their account.",
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not do that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant={goingLive ? "soft" : "secondary"}
        onClick={() => setOpen(true)}
      >
        {goingLive ? "Take live" : "Close"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={goingLive ? `Take ${name} live?` : `Close ${name}?`}
        description={
          goingLive
            ? "Students and staff there will be able to register and be matched with each other."
            : "Nobody new can register. People who already have an account keep it, and their commutes keep running."
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant={goingLive ? "primary" : "danger"}
              onClick={submit}
              loading={busy}
              disabled={password.length === 0 || (!goingLive && reason.trim().length < 5)}
            >
              {goingLive ? "Take live" : "Close institution"}
            </Button>
          </>
        }
      >
        {!goingLive ? (
          <Field
            label="Why are you closing it?"
            htmlFor="deactivate-reason"
            hint="Recorded in the audit log against your name."
          >
            <Textarea
              id="deactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        ) : null}

        <Field
          label="Your password"
          htmlFor="activation-password"
          hint="Asked for again because this decides whether a whole university can use GoSaath."
          {...(error ? { error } : {})}
        >
          <Input
            id="activation-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </Dialog>
    </>
  );
}
