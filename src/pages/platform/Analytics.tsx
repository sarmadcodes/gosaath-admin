import { useState } from "react";
import { api } from "../../api";
import { useQuery } from "../../data";
import { Card, ErrorState, Segments, Skeleton } from "../../design/ui";

/**
 * Analytics.
 *
 * Three questions, not a wall of charts: are people still joining, do they
 * set up a commute once they have joined, and is the verification queue
 * being cleared as fast as it fills.
 *
 * Everything here is drawn from real aggregates over a bounded window. There
 * is no chart on this page that exists because dashboards usually have one.
 */

type Window = "7" | "30" | "90";

export function Analytics() {
  const [days, setDays] = useState<Window>("30");
  const { data, loading, error, reload } = useQuery(`analytics:${days}`, () =>
    api.analytics(Number(days)),
  );

  return (
    <div className="stack gap-5">
      <div className="between gap-4 wrap">
        <div>
          <h2 className="h1">Analytics</h2>
          <p className="small t-2" style={{ marginTop: 2 }}>
            How GoSaath is actually being used, across every institution.
          </p>
        </div>
        <Segments<Window>
          value={days}
          onChange={setDays}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
        />
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="analytics" /> : null}
      {loading && !data ? (
        <div className="stack gap-4">
          <Skeleton height={190} radius="var(--radius-lg)" />
          <Skeleton height={190} radius="var(--radius-lg)" />
        </div>
      ) : null}

      {data ? (
        <>
          <div
            style={{
              display: "grid",
              gap: "var(--space-3)",
              gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
            }}
          >
            <Stat value={data.totals.members} label="Members" sub="Verified email, not deleted" />
            <Stat
              value={data.totals.activeCommutes}
              label="Active commutes"
              sub="Recurring timetables"
            />
            <Stat
              value={data.totals.offeringSeats}
              label="Offering seats"
              sub="The supply side"
            />
            <Stat
              value={data.totals.lookingForRides}
              label="Looking for a ride"
              sub={demandNote(data.totals.offeringSeats, data.totals.lookingForRides)}
            />
          </div>

          <Chart
            title="People joining"
            caption="New accounts per day. Empty days are shown as empty, not skipped."
            points={data.signups}
          />

          <Chart
            title="Commutes set up"
            caption="A commute created is the moment somebody actually starts using GoSaath."
            points={data.commutes}
          />

          <Card>
            <p className="h2">Verification</p>
            <p className="small t-2" style={{ marginTop: 2, marginBottom: "var(--space-4)" }}>
              Where every application currently stands.
            </p>
            <Funnel
              stages={[
                { label: "Waiting", value: data.verification.pending, tone: "var(--warning)" },
                { label: "Approved", value: data.verification.approved, tone: "var(--brand)" },
                { label: "Rejected", value: data.verification.rejected, tone: "var(--text-3)" },
              ]}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}

/** The ratio that decides whether the product works at an institution. */
function demandNote(offering: number, looking: number): string {
  if (offering === 0 && looking === 0) return "Nobody has a commute yet";
  if (offering === 0) return "Nobody is driving: this is a waiting list";
  const perDriver = (looking / offering).toFixed(1);
  return `${perDriver} per person offering`;
}

/**
 * A bar chart, drawn as bars.
 *
 * No charting library: this is one series against a shared maximum, and a
 * 90 kB dependency to draw forty rectangles would be the wrong trade. It
 * scales to the container, reads in both themes, and every bar is in the
 * accessibility tree as a number rather than as decoration.
 */
function Chart({
  title,
  caption,
  points,
}: {
  title: string;
  caption: string;
  points: Array<{ date: string; count: number }>;
}) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <Card>
      <div className="between gap-3 wrap">
        <div>
          <p className="h2">{title}</p>
          <p className="small t-2" style={{ marginTop: 2 }}>
            {caption}
          </p>
        </div>
        <p className="small t-2 numeric">
          {total} over {points.length} days
        </p>
      </div>

      <div
        role="img"
        aria-label={`${title}: ${total} over ${points.length} days, peak ${max} in a day`}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 120,
          marginTop: "var(--space-5)",
        }}
      >
        {points.map((point) => (
          <span
            key={point.date}
            title={`${point.date}: ${point.count}`}
            style={{
              flex: 1,
              minWidth: 2,
              height: `${Math.max(2, (point.count / max) * 100)}%`,
              background: point.count > 0 ? "var(--brand)" : "var(--border)",
              borderRadius: 2,
              transition: "height var(--normal) var(--ease)",
            }}
          />
        ))}
      </div>

      <div className="between" style={{ marginTop: "var(--space-2)" }}>
        <span className="caption t-3">{points[0]?.date}</span>
        <span className="caption t-3">{points[points.length - 1]?.date}</span>
      </div>
    </Card>
  );
}

function Funnel({
  stages,
}: {
  stages: Array<{ label: string; value: number; tone: string }>;
}) {
  const total = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <div className="stack gap-3">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="between" style={{ marginBottom: 4 }}>
            <span className="small">{stage.label}</span>
            <span className="small numeric t-2">{stage.value}</span>
          </div>
          <span
            aria-hidden
            style={{
              display: "block",
              height: 6,
              borderRadius: 3,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(stage.value / total) * 100}%`,
                background: stage.tone,
                transition: "width var(--normal) var(--ease)",
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub: string }) {
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
