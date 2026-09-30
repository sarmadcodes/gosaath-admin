import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  BuildingsIcon,
  CheckCircleIcon,
  SealCheckIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { api } from "../../api";
import { useQuery } from "../../data";
import { Badge, Card, ErrorState, Skeleton } from "../../design/ui";
import { describeAction, relativeTime } from "../../format";

/**
 * The platform, on one screen.
 *
 * The question a platform administrator opens this to answer is "what is
 * happening across GoSaath, and is anything stuck". So: what is waiting on
 * somebody first, then the shape of the platform, then where growth is
 * actually coming from and which institutions have gone quiet.
 *
 * Quiet institutions are the number nobody thinks to ask for. An institution
 * that onboarded and then produced no commutes for a week has a problem that
 * no total will show, because the totals keep going up without it.
 */
export function PlatformOverview() {
  const platform = useQuery("platform:overview", () => api.platformOverview());
  const shared = useQuery("overview", () => api.overview());
  const activity = useQuery("audit:recent", () => api.audit());

  const data = platform.data;
  const counts = shared.data;

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="stack gap-6">
      <div>
        <h2 className="display">{greeting}</h2>
        <p className="body t-2" style={{ marginTop: 2 }}>
          GoSaath platform ·{" "}
          {now.toLocaleDateString("en-PK", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Karachi",
          })}
        </p>
      </div>

      {platform.error ? (
        <ErrorState error={platform.error} onRetry={platform.reload} what="the platform" />
      ) : null}

      {platform.loading && !data ? <OverviewSkeleton /> : null}

      {data ? (
        <>
          <section>
            <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
              Needs attention
            </h3>
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="rows">
                {(counts?.pendingVerifications ?? 0) > 0 ? (
                  <QueueRow
                    to="/verifications"
                    icon={<SealCheckIcon size={18} color="var(--brand)" />}
                    count={counts!.pendingVerifications}
                    noun={
                      counts!.pendingVerifications === 1
                        ? "verification request, across every institution"
                        : "verification requests, across every institution"
                    }
                  />
                ) : null}
                {data.escalatedReports > 0 ? (
                  <QueueRow
                    to="/reports"
                    icon={<ShieldWarningIcon size={18} color="var(--danger)" />}
                    count={data.escalatedReports}
                    noun={
                      data.escalatedReports === 1
                        ? "report escalated to the platform team"
                        : "reports escalated to the platform team"
                    }
                  />
                ) : null}
                {data.pendingInstitutionRequests > 0 ? (
                  <QueueRow
                    to="/institutions"
                    icon={<BuildingsIcon size={18} color="var(--warning)" />}
                    count={data.pendingInstitutionRequests}
                    noun={
                      data.pendingInstitutionRequests === 1
                        ? "institution people have asked for"
                        : "institutions people have asked for"
                    }
                  />
                ) : null}
                {(counts?.pendingVerifications ?? 0) === 0 &&
                data.escalatedReports === 0 &&
                data.pendingInstitutionRequests === 0 ? (
                  <div className="row-item">
                    <CheckCircleIcon size={20} weight="fill" color="var(--success)" />
                    <div>
                      <p className="h3">Nothing is waiting</p>
                      <p className="small t-2">
                        No escalations, no verification backlog, no institution requests.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
              The platform
            </h3>
            <div
              style={{
                display: "grid",
                gap: "var(--space-3)",
                gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
              }}
            >
              <Stat value={data.liveInstitutions} label="Live institutions" sub={`${data.institutions} on the platform`} />
              <Stat
                value={data.members}
                label="Members"
                sub={`${data.newMembersThisWeek} joined this week`}
              />
              <Stat
                value={data.activeCommutes}
                label="Active commutes"
                sub="Recurring, across all institutions"
              />
              <Stat
                value={counts?.openReports ?? 0}
                label="Open reports"
                sub="Including institution-level"
              />
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gap: "var(--space-5)",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            <section>
              <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
                Where members joined this week
              </h3>
              <Card pad={false}>
                {data.signupsThisWeek.length > 0 ? (
                  <div className="rows">
                    {data.signupsThisWeek.map((row) => (
                      <div className="row-item" key={row.institution}>
                        <span className="body grow truncate">{row.institution}</span>
                        <Bar
                          value={row.count}
                          max={data.signupsThisWeek[0]?.count ?? 1}
                        />
                        <span
                          className="small numeric t-2"
                          style={{ width: 28, textAlign: "right" }}
                        >
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="row-item">
                    <p className="small t-2">Nobody joined this week.</p>
                  </div>
                )}
              </Card>
            </section>

            <section>
              <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
                Gone quiet
              </h3>
              <Card pad={false}>
                {data.quietInstitutions.length > 0 ? (
                  <div className="rows">
                    {data.quietInstitutions.map((name) => (
                      <div className="row-item" key={name}>
                        <span className="body grow truncate">{name}</span>
                        <Badge tone="warning">No commutes this week</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="row-item">
                    <p className="small t-2">
                      Every live institution created a commute this week.
                    </p>
                  </div>
                )}
              </Card>
              <p className="caption t-3" style={{ marginTop: "var(--space-2)" }}>
                Live institutions with no new commute in the last seven days.
              </p>
            </section>
          </div>

          <section>
            <div className="between" style={{ marginBottom: "var(--space-3)" }}>
              <h3 className="h2">Recent platform activity</h3>
              <Link to="/audit" className="small">
                Full audit log
              </Link>
            </div>
            <Card pad={false}>
              {activity.data && activity.data.length > 0 ? (
                <div className="rows">
                  {activity.data.slice(0, 8).map((entry) => (
                    <div className="row-item" key={entry.id}>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <p className="small truncate">{describeAction(entry.action)}</p>
                        <p className="caption t-3">{entry.actorRole}</p>
                      </div>
                      <span className="caption t-3">{relativeTime(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="row-item">
                  <p className="small t-2">Nothing has been recorded yet.</p>
                </div>
              )}
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
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
          width: `${Math.round((value / (max || 1)) * 100)}%`,
          background: "var(--brand)",
        }}
      />
    </span>
  );
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
    <Link
      to={to}
      className="row-item row-link"
      style={{ color: "inherit", textDecoration: "none" }}
    >
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

function Stat({ value, label, sub }: { value: number | string; label: string; sub: string }) {
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
      <Skeleton width={220} height={20} />
      <div
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
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
