import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { api } from "../api";
import { useQuery } from "../data";
import {
  Avatar,
  Badge,
  BadgeStatus,
  Card,
  EmptyState,
  ErrorState,
  Input,
  RowsSkeleton,
  Segments,
} from "../design/ui";
import { formatDate } from "../format";

/**
 * The people directory.
 *
 * A searchable list rather than a spreadsheet. Each row answers "who is
 * this" first — a face, a name, where they travel to — and the operational
 * columns come after.
 *
 * No phone number appears here, and there is no column that could hold one.
 * A reveal that asks for a reason and writes an audit entry is worth nothing
 * if the same numbers can be read a hundred at a time from a list.
 */

type Filter = "all" | "pending" | "approved" | "suspended";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "pending", label: "Awaiting verification" },
  { value: "approved", label: "Verified" },
  { value: "suspended", label: "Suspended" },
];

export function People() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Typing is not a request. Without this the server sees one query per
  // keystroke and the list flickers through partial matches.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(typed.trim()), 250);
    return () => clearTimeout(timer);
  }, [typed]);

  const badgeStatus = filter === "pending" || filter === "approved" ? filter : undefined;

  const { data, loading, error, reload } = useQuery(
    `members:${query}:${badgeStatus ?? ""}`,
    () => api.members({ ...(query ? { q: query } : {}), ...(badgeStatus ? { badgeStatus } : {}) }),
  );

  // Suspension is not a server-side filter, so it is applied here rather than
  // pretending the server offers it.
  const members = useMemo(
    () => (filter === "suspended" ? (data ?? []).filter((m) => m.suspended) : (data ?? [])),
    [data, filter],
  );

  return (
    <div className="stack gap-5">
      <div className="between gap-4 wrap">
        <div>
          <h2 className="h1">People</h2>
          <p className="small t-2" style={{ marginTop: 2 }}>
            Students and staff with a confirmed institution email.
          </p>
        </div>
        <Input
          type="search"
          placeholder="Search name or email"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          icon={<MagnifyingGlassIcon size={15} />}
          aria-label="Search people"
          style={{ width: 280 }}
        />
      </div>

      <div className="between gap-3 wrap">
        <Segments value={filter} onChange={setFilter} options={FILTERS} />
        {data ? (
          <p className="caption t-3 numeric">
            {members.length} {members.length === 1 ? "person" : "people"}
          </p>
        ) : null}
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="the directory" /> : null}
      {loading && !data ? <RowsSkeleton rows={7} /> : null}

      {data && members.length === 0 ? (
        <EmptyState
          icon={<UsersThreeIcon size={24} />}
          title={query ? "Nobody matches that" : "No one here yet"}
          body={
            query
              ? "Try part of a name, or the start of an email address."
              : "People appear here once they register and confirm their institution email."
          }
        />
      ) : null}

      {members.length > 0 ? (
        <Card pad={false} style={{ overflow: "hidden" }}>
          <div className="rows">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="row-item row-link"
                onClick={() => navigate(`/members/${member.id}`)}
              >
                <Avatar name={member.name} />

                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row gap-2">
                    <span className="h3 truncate">{member.name}</span>
                    {member.suspended ? <Badge tone="danger">Suspended</Badge> : null}
                  </div>
                  <span className="caption t-3 truncate">{member.email}</span>
                </div>

                <span className="small t-2 truncate hide-narrow" style={{ width: 140 }}>
                  {member.campusName}
                </span>

                <span className="small t-2 truncate hide-narrow" style={{ width: 120, textTransform: "capitalize" }}>
                  {member.userType}
                </span>

                <span style={{ width: 96 }}>
                  <BadgeStatus status={member.badgeStatus} />
                </span>

                <span className="caption t-3 hide-narrow" style={{ width: 92, textAlign: "right" }}>
                  {formatDate(member.joinedAt)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
