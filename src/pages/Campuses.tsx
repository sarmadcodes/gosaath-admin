import { useState } from "react";
import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react";
import * as Switch from "@radix-ui/react-switch";
import { api, ApiError, type Campus } from "../api";
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
  Input,
  RowsSkeleton,
  useToast,
} from "../design/ui";

/**
 * Campuses.
 *
 * Small on purpose: this is the one screen where overdesigning basic CRUD
 * would be the mistake. The only real risk is closing a campus that has
 * members on it, so the server refuses unless it is confirmed and returns
 * the count, and this screen asks the question with that number in it.
 */
export function Campuses() {
  const toast = useToast();
  const { data, loading, error, reload } = useQuery("campuses", () => api.campuses());
  const [confirming, setConfirming] = useState<{ campus: Campus; affected: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setActive(campus: Campus, active: boolean, confirm = false) {
    setBusyId(campus.id);
    setActionError(null);
    try {
      await api.updateCampus(campus.id, { active, ...(confirm ? { confirm } : {}) });
      setConfirming(null);
      invalidate("campuses");
      await reload();
      toast.show({
        tone: "success",
        title: active ? `${campus.name} is open` : `${campus.name} is closed`,
        body: active
          ? "People can pick this campus when they register."
          : "Nobody new can pick this campus. Existing members keep their account.",
      });
    } catch (caught) {
      // The server answers with how many people it would affect rather than
      // a flat refusal, so the question can be asked properly.
      const affected =
        caught instanceof ApiError ? Number(caught.details?.["affectedMembers"] ?? 0) : 0;
      if (affected > 0) setConfirming({ campus, affected });
      else setActionError(caught instanceof Error ? caught.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  const campuses = data ?? [];

  return (
    <div className="stack gap-5">
      <div className="between gap-4 wrap">
        <div>
          <h2 className="h1">Campuses</h2>
          <p className="small t-2" style={{ marginTop: 2 }}>
            People are matched with others travelling to the same campus.
          </p>
        </div>
        <NewCampus onDone={reload} />
      </div>

      {actionError ? <InlineError message={actionError} /> : null}
      {error ? <ErrorState error={error} onRetry={reload} what="campuses" /> : null}
      {loading && !data ? <RowsSkeleton rows={2} /> : null}

      {data && campuses.length === 0 ? (
        <EmptyState
          icon={<BuildingsIcon size={24} />}
          title="No campuses yet"
          body="Add the campuses people travel to. They pick one when they register."
        />
      ) : null}

      {campuses.length > 0 ? (
        <Card pad={false} style={{ overflow: "hidden" }}>
          <div className="rows">
            {campuses.map((campus) => (
              <div className="row-item" key={campus.id}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row gap-2">
                    <span className="h3">{campus.name}</span>
                    {campus.active ? (
                      <Badge tone="success">Open</Badge>
                    ) : (
                      <Badge tone="neutral">Closed</Badge>
                    )}
                  </div>
                  <span className="caption t-3">
                    {campus.areaName ?? "No area set"} · {campus.members}{" "}
                    {campus.members === 1 ? "member" : "members"}
                  </span>
                </div>

                <Switch.Root
                  checked={campus.active}
                  disabled={busyId === campus.id}
                  onCheckedChange={(next) => setActive(campus, next)}
                  aria-label={`${campus.name} open to new members`}
                  style={{
                    width: 38,
                    height: 22,
                    borderRadius: "var(--radius-full)",
                    border: "none",
                    background: campus.active ? "var(--brand)" : "var(--surface-2)",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background var(--fast) var(--ease)",
                  }}
                >
                  <Switch.Thumb
                    style={{
                      display: "block",
                      width: 16,
                      height: 16,
                      borderRadius: "var(--radius-full)",
                      background: campus.active ? "var(--on-brand)" : "var(--surface)",
                      transform: campus.active ? "translateX(19px)" : "translateX(3px)",
                      transition: "transform var(--fast) var(--ease)",
                    }}
                  />
                </Switch.Root>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Close this campus?"
        description={
          confirming
            ? `${confirming.affected} ${confirming.affected === 1 ? "person is" : "people are"} attached to ${confirming.campus.name}. They keep their account and their commute, but nobody new can pick this campus.`
            : ""
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Keep it open</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={busyId !== null}
              onClick={() => confirming && setActive(confirming.campus, false, true)}
            >
              Close campus
            </Button>
          </>
        }
      />
    </div>
  );
}

function NewCampus({ onDone }: { onDone: () => Promise<void> | void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.createCampus(name.trim());
      setOpen(false);
      setName("");
      invalidate("campuses");
      await onDone();
      toast.show({ tone: "success", title: "Campus added" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add it.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" icon={<PlusIcon size={15} />} onClick={() => setOpen(true)}>
        Add campus
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add a campus"
        description="Use the name people would recognise, as it appears on signs."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="primary"
              onClick={submit}
              loading={busy}
              disabled={name.trim().length < 2}
            >
              Add campus
            </Button>
          </>
        }
      >
        <Field label="Campus name" htmlFor="campus-name" {...(error ? { error } : {})}>
          <Input
            id="campus-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Clifton Campus"
          />
        </Field>
      </Dialog>
    </>
  );
}
