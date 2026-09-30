import { useState } from "react";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { api } from "../../api";
import { useQuery } from "../../data";
import { Badge, Card, EmptyState, ErrorState, RowsSkeleton, Segments } from "../../design/ui";
import { describeAction, formatDateTime } from "../../format";

/**
 * The audit log.
 *
 * Append-only on the server and read-only here, which is the point: a log an
 * administrator can edit is not evidence of anything.
 *
 * The filters are the questions actually asked after an incident — who is
 * acting on accounts, who is deciding verifications, what changed about an
 * institution — rather than a free-text search over an event stream.
 */

type Filter = "all" | "accounts" | "verification" | "moderation" | "institutions";

/**
 * Filters map to actions rather than to a category column, because the
 * server records actions and inventing a category here would be a second
 * vocabulary to keep in step with the first.
 */
const FILTER_ACTIONS: Record<Exclude<Filter, "all">, string[]> = {
  accounts: ["member.suspended", "member.restored", "member.phoneRevealed"],
  verification: ["verification.approved", "verification.rejected"],
  moderation: ["report.actioned", "report.dismissed", "report.escalated"],
  institutions: [
    "institution.created",
    "institution.updated",
    "institution.activated",
    "institution.deactivated",
    "campus.created",
    "campus.updated",
  ],
};

/** Actions worth marking as security-sensitive when scanning the log. */
const SENSITIVE = new Set([
  "member.phoneRevealed",
  "member.suspended",
  "institution.activated",
  "institution.deactivated",
  "admin.removed",
  "admin.invited",
]);

export function AuditLog() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, loading, error, reload } = useQuery("audit:all", () => api.audit());

  const entries = (data ?? []).filter((entry) => {
    if (filter === "all") return true;
    return FILTER_ACTIONS[filter].includes(entry.action);
  });

  return (
    <div className="stack gap-5">
      <div>
        <h2 className="h1">Audit log</h2>
        <p className="small t-2" style={{ marginTop: 2 }}>
          Every administrative action across GoSaath. Append-only, and not
          editable by anybody.
        </p>
      </div>

      <Segments<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Everything" },
          { value: "accounts", label: "Accounts" },
          { value: "verification", label: "Verification" },
          { value: "moderation", label: "Moderation" },
          { value: "institutions", label: "Institutions" },
        ]}
      />

      {error ? <ErrorState error={error} onRetry={reload} what="the audit log" /> : null}
      {loading && !data ? <RowsSkeleton rows={8} /> : null}

      {data && entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardTextIcon size={24} />}
          title="Nothing recorded"
          body={
            filter === "all"
              ? "Administrative actions appear here as they happen."
              : "Nothing of this kind has been recorded yet."
          }
        />
      ) : null}

      {entries.length > 0 ? (
        <Card pad={false} style={{ overflow: "hidden" }}>
          <div className="rows">
            {entries.map((entry) => (
              <div className="row-item" key={entry.id}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row gap-2">
                    <span className="body truncate">{describeAction(entry.action)}</span>
                    {SENSITIVE.has(entry.action) ? (
                      <Badge tone="warning">Sensitive</Badge>
                    ) : null}
                  </div>
                  <span className="caption t-3 truncate">
                    {entry.actorRole === "superAdmin" ? "Platform admin" : "University admin"}
                    {entry.targetType ? ` · on a ${entry.targetType}` : ""}
                  </span>
                </div>
                <span className="caption t-3 numeric">{formatDateTime(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <p className="caption t-3">
        Showing the most recent {entries.length}. The full history is kept on the
        server and never trimmed.
      </p>
    </div>
  );
}
