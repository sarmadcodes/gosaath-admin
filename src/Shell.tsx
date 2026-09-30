import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BuildingsIcon,
  CaretUpDownIcon,
  GaugeIcon,
  MoonIcon,
  SealCheckIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SunIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api, type AdminMe } from "./api";
import { useQuery } from "./data";
import { Avatar, Tooltip } from "./design/ui";

/**
 * The console shell.
 *
 * The sidebar carries the two things an admin needs to know before they read
 * anything else: which institution they are acting inside, and what is
 * waiting on them. The queue counts sit on the navigation itself, so
 * "anything to do today" is answered without opening a page.
 */

const NAV = [
  { to: "/", label: "Overview", icon: GaugeIcon, end: true, queue: null },
  { to: "/verifications", label: "Verification", icon: SealCheckIcon, end: false, queue: "verifications" },
  { to: "/members", label: "People", icon: UsersThreeIcon, end: false, queue: null },
  { to: "/reports", label: "Reports", icon: WarningIcon, end: false, queue: "reports" },
] as const;

const INSTITUTION_NAV = [
  { to: "/campuses", label: "Campuses", icon: BuildingsIcon, end: false, queue: null },
] as const;

type Theme = "light" | "dark" | "system";

function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("gosaath.admin.theme") as Theme) ?? "system",
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    localStorage.setItem("gosaath.admin.theme", theme);
  }, [theme]);

  return [theme, setTheme] as const;
}

export function Shell({
  admin,
  onSignedOut,
  children,
}: {
  admin: AdminMe;
  onSignedOut: () => void;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useTheme();

  // Remembered, because an admin who collapses the sidebar means it.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("gosaath.admin.sidebar") === "collapsed",
  );
  useEffect(() => {
    localStorage.setItem("gosaath.admin.sidebar", collapsed ? "collapsed" : "open");
  }, [collapsed]);

  // The same cached request the overview makes, so this costs nothing extra.
  const { data: overview } = useQuery("overview", () => api.overview());
  const counts: Record<string, number> = {
    verifications: overview?.pendingVerifications ?? 0,
    reports: overview?.openReports ?? 0,
  };

  const signOut = useCallback(() => {
    api.signOut();
    onSignedOut();
    navigate("/");
  }, [navigate, onSignedOut]);

  const title =
    [...NAV, ...INSTITUTION_NAV].find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )?.label ?? "Overview";

  return (
    <div className="shell" data-collapsed={collapsed}>
      <aside className="sidebar">
        <div
          className="row gap-2"
          style={{ height: 36, paddingLeft: collapsed ? 0 : "var(--space-2)", justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <Wordmark />
          {!collapsed ? (
            <span className="h2" style={{ fontSize: 16 }}>
              GoSaath
            </span>
          ) : null}
        </div>

        <nav className="stack gap-1" style={{ marginTop: "var(--space-4)" }}>
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} count={item.queue ? (counts[item.queue] ?? 0) : 0} />
          ))}

          {!collapsed ? <p className="nav-group">Institution</p> : <div style={{ height: 12 }} />}

          {INSTITUTION_NAV.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} count={0} />
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div className="stack gap-1">
          <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <button
              type="button"
              className="nav-link"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ border: "none", background: "none", cursor: "pointer", width: "100%" }}
            >
              <SidebarSimpleIcon size={18} />
              {!collapsed ? <span>Collapse</span> : null}
            </button>
          </Tooltip>
        </div>
      </aside>

      <div className="stack" style={{ minWidth: 0 }}>
        <header className="topbar">
          <div className="row gap-3" style={{ minWidth: 0 }}>
            <h1 className="h1" style={{ fontSize: 17, lineHeight: "24px" }}>
              {title}
            </h1>
          </div>

          <div className="row gap-2">
            <Tooltip label={theme === "dark" ? "Switch to light" : "Switch to dark"}>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Switch colour theme"
              >
                {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
              </button>
            </Tooltip>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ paddingLeft: 6, paddingRight: 10, height: 40 }}
                >
                  <Avatar name={admin.name} />
                  <span className="stack hide-narrow" style={{ alignItems: "flex-start", gap: 0 }}>
                    <span className="h3">{admin.name}</span>
                    <span className="caption t-3">{admin.institutionName}</span>
                  </span>
                  <CaretUpDownIcon size={14} />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content className="menu" align="end" sideOffset={6}>
                  <div style={{ padding: "var(--space-2) var(--space-3)" }}>
                    <p className="h3">{admin.name}</p>
                    <p className="caption t-3">{admin.email}</p>
                    <p className="caption t-3" style={{ marginTop: 4 }}>
                      {admin.scope.kind === "platform"
                        ? "Platform administrator"
                        : `${admin.institutionName} administrator`}
                    </p>
                  </div>
                  <DropdownMenu.Separator
                    style={{ height: 1, background: "var(--border-soft)", margin: "var(--space-1) 0" }}
                  />
                  <DropdownMenu.Item className="menu-item menu-item-danger" onSelect={signOut}>
                    <SignOutIcon size={15} />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main className={location.pathname.startsWith("/verifications/") ? "workspace" : "page"}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  item,
  collapsed,
  count,
}: {
  item: { to: string; label: string; icon: React.ElementType; end: boolean };
  collapsed: boolean;
  count: number;
}) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className="nav-link"
      {...(collapsed ? { style: { justifyContent: "center", padding: 0 } } : {})}
    >
      <Icon size={18} />
      {!collapsed ? (
        <>
          <span>{item.label}</span>
          {count > 0 ? (
            <span className="nav-count" aria-label={`${count} waiting`}>
              {count}
            </span>
          ) : null}
        </>
      ) : null}
    </NavLink>
  );

  // Collapsed, the label has to come from somewhere.
  return collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link;
}

/** The mark, drawn once: two paths sharing a route. */
function Wordmark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="8" fill="var(--brand)" />
      <path
        d="M7 17.5c2.2 0 2.2-9 4.5-9s2.3 9 4.5 9"
        stroke="var(--on-brand)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="18.6" cy="9.4" r="1.7" fill="var(--on-brand)" />
    </svg>
  );
}
