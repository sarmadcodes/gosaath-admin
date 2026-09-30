import { UserGearIcon } from "@phosphor-icons/react";
import { api } from "../../api";
import { useQuery } from "../../data";
import { Avatar, Badge, Card, EmptyState, ErrorState, RowsSkeleton } from "../../design/ui";

/**
 * Who can administer GoSaath, and over what.
 *
 * Read-only here on purpose. Granting administration happens by invitation,
 * which is the only path into an institution and is a flow of its own; this
 * screen answers "who currently holds what", which is the question somebody
 * asks during an incident.
 *
 * A university administrator cannot reach this at all, and could not promote
 * themselves through it if they did: the server refuses the endpoint, and
 * every route behind it, for anybody outside the platform scope.
 */
export function Administrators() {
  const { data, loading, error, reload } = useQuery("admins", () => api.admins());

  const admins = data?.admins ?? [];
  const platform = admins.filter((a) => a.role === "superAdmin");
  const institution = admins.filter((a) => a.role !== "superAdmin");

  return (
    <div className="stack gap-5">
      <div>
        <h2 className="h1">Administrators</h2>
        <p className="small t-2" style={{ marginTop: 2 }}>
          Everyone who can administer GoSaath, and the scope they hold.
        </p>
      </div>

      {error ? <ErrorState error={error} onRetry={reload} what="administrators" /> : null}
      {loading && !data ? <RowsSkeleton rows={3} /> : null}

      {data && admins.length === 0 ? (
        <EmptyState
          icon={<UserGearIcon size={24} />}
          title="No administrators yet"
          body="Administrators are added by invitation from the platform team."
        />
      ) : null}

      {platform.length > 0 ? (
        <section>
          <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
            Platform
          </h3>
          <Card pad={false} style={{ overflow: "hidden" }}>
            <div className="rows">
              {platform.map((admin) => (
                <AdminRowItem key={admin.id} admin={admin} scope="GoSaath platform" />
              ))}
            </div>
          </Card>
          <p className="caption t-3" style={{ marginTop: "var(--space-2)" }}>
            Platform administrators can see and act across every institution.
          </p>
        </section>
      ) : null}

      {institution.length > 0 ? (
        <section>
          <h3 className="h2" style={{ marginBottom: "var(--space-3)" }}>
            Institutions
          </h3>
          <Card pad={false} style={{ overflow: "hidden" }}>
            <div className="rows">
              {institution.map((admin) => (
                <AdminRowItem
                  key={admin.id}
                  admin={admin}
                  scope={admin.institutionName || "No institution"}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function AdminRowItem({
  admin,
  scope,
}: {
  admin: { id: string; name: string; email: string; role: string; suspended: boolean };
  scope: string;
}) {
  return (
    <div className="row-item">
      <Avatar name={admin.name} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row gap-2">
          <span className="h3 truncate">{admin.name}</span>
          {admin.suspended ? <Badge tone="danger">Suspended</Badge> : null}
        </div>
        <span className="caption t-3 truncate">{admin.email}</span>
      </div>
      <span className="small t-2 truncate" style={{ maxWidth: 220 }}>
        {scope}
      </span>
      <Badge tone={admin.role === "superAdmin" ? "brand" : "neutral"}>
        {admin.role === "superAdmin" ? "Super Admin" : "University Admin"}
      </Badge>
    </div>
  );
}
