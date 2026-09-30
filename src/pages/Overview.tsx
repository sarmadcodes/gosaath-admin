import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  SealCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api, type AdminMe } from "../api";
import { useQuery } from "../data";
import { Card, ErrorState, Skeleton } from "../design/ui";
import { describeAction, relativeTime } from "../format";

/**
 * What an administrator needs to know on opening the console.
 *
 * Ordered by what it asks of them rather than by what is easiest to draw:
 * first the two queues that are waiting on a person, then the state of the
 * institution, then what has already been done. A wall of equal-sized number
 * tiles buries the only part that needs acting on today.
 */
export function Overview({ admin }: { admin: AdminMe }) {
  const { data, loading, error, reload } = useQuery("overview", () => api.overview());
  const { data: activity } = useQuery("activity", () => api.activity());

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="stack gap-6">
      <div>
        <h2 className="display">{greeting}</h2>
        <p className="body t-2" style={{ marginTop: 2 }}>
          {admin.institutionName} ·{" "}
          {now.toLocaleDateString("en-PK", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Karachi",
          })}
        </p>
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="your overview" /> : null}

      {loading && !data ? <OverviewSkeleton /> : null}

      {data ? (
        <>
          <section>
            <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
              Needs attention
            </h3>

            {data.pendingVerifications === 0 && data.openReports === 0 ? (
              <Card className="row gap-3">
                <CheckCircleIcon size={20} weight="fill" color="var(--success)" />
                <div>
                  <p className="h3">You are all caught up</p>
                  <p className="small t-2">
                    Nothing is waiting on you at {admin.institutionName} right now.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="rows">
                  {data.pendingVerifications > 0 ? (
                    <QueueRow
                      to="/verifications"
                      icon={<SealCheckIcon size={18} color="var(--brand)" />}
                      count={data.pendingVerifications}
                      noun={
                        data.pendingVerifications === 1
                          ? "student is awaiting verification"
                          : "students are awaiting verification"
                      }
                    />
                  ) : null}
                  {data.openReports > 0 ? (
                    <QueueRow
                      to="/reports"
                      icon={<WarningIcon size={18} color="var(--warning)" />}
                      count={data.openReports}
                      noun={
                        data.openReports === 1
                          ? "report needs review"
                          : "reports need review"
                      }
                    />
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
              This week
            </h3>
            <div
              style={{
                display: "grid",
                gap: "var(--space-3)",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              }}
            >
              <Stat value={data.members} label="Members" sub={`${data.newMembersThisWeek} joined this week`} />
              <Stat value={data.activeCommutes} label="Active commutes" sub="Recurring, not one-off trips" />
              <Stat
                value={`${data.seatsTaken}/${data.seatsOffered}`}
                label="Seats taken"
                sub={seatSummary(data.seatsTaken, data.seatsOffered)}
              />
              <Stat
                value={data.topAreas[0]?.commuters ?? 0}
                label={data.topAreas[0] ? `From ${data.topAreas[0].area}` : "Top area"}
                sub="The largest single origin"
              />
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gap: "var(--space-5)",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            {data.topAreas.length > 0 ? (
              <section>
                <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
                  Where people travel from
                </h3>
                <Card pad={false}>
                  <div className="rows">
                    {data.topAreas.map((area) => (
                      <div className="row-item" key={area.area}>
                        <span className="body grow truncate">{area.area}</span>
                        {/* A proportion bar, not a chart. It answers "which
                            of these is the big one" at a glance. */}
                        <span
                          aria-hidden
                          style={{
                            width: 90,
                            height: 4,
                            borderRadius: 2,
                            background: "var(--surface-2)",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              height: "100%",
                              width: `${Math.round((area.commuters / (data.topAreas[0]?.commuters || 1)) * 100)}%`,
                              background: "var(--brand)",
                            }}
                          />
                        </span>
                        <span className="small numeric t-2" style={{ width: 28, textAlign: "right" }}>
                          {area.commuters}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
                <p className="caption t-3" style={{ marginTop: "var(--space-2)" }}>
                  Areas only. GoSaath never records an address.
                </p>
              </section>
            ) : null}

            <section>
              <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
                Recent activity
              </h3>
              <Card pad={false}>
                {activity && activity.length > 0 ? (
                  <div className="rows">
                    {activity.slice(0, 7).map((entry) => (
                      <div className="row-item" key={entry.id}>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <p className="small truncate">{describeAction(entry.action)}</p>
                          <p className="caption t-3 truncate">by {entry.actorName}</p>
                        </div>
                        <span className="caption t-3">{relativeTime(entry.at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="row-item">
                    <p className="small t-2">
                      Nothing has been done here yet. Admin actions appear as they happen.
                    </p>
                  </div>
                )}
              </Card>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function seatSummary(taken: number, offered: number): string {
  if (offered === 0) return "Nobody is offering seats yet";
  const free = offered - taken;
  if (free <= 0) return "Every offered seat is taken";
  return `${free} still free`;
}

function QueueRow({
  to,
  icon,
  count,
  noun,
}: {
  to: string;
  icon: React.ReactNode;
  count: number;
  noun: string;
}) {
  return (
    <Link to={to} className="row-item row-link" style={{ color: "inherit", textDecoration: "none" }}>
      {icon}
      <p className="body grow">
        <span className="numeric" style={{ fontWeight: 600 }}>
          {count}
        </span>{" "}
        {noun}
      </p>
      <ArrowRightIcon size={16} color="var(--text-3)" />
    </Link>
  );
}

function Stat({
  value,
  label,
  sub,
}: {
  value: number | string;
  label: string;
  sub: string;
}) {
  return (
    <Card>
      <p className="display numeric" style={{ fontSize: 26, lineHeight: "32px" }}>
        {value}
      </p>
      <p className="h3" style={{ marginTop: 2 }}>
        {label}
      </p>
      <p className="caption t-3" style={{ marginTop: 2 }}>
        {sub}
      </p>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="stack gap-6">
      <Skeleton width={200} height={20} />
      <div
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="card card-pad stack gap-2" key={index}>
            <Skeleton width={64} height={28} />
            <Skeleton width={96} height={13} />
            <Skeleton width={120} height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}
