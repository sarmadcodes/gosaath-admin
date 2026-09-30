import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BuildingsIcon,
  CaretUpDownIcon,
  ChartLineIcon,
  ClipboardTextIcon,
  GaugeIcon,
  MoonIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SunIcon,
  UserGearIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api, type AdminMe } from "./api";
import { useQuery } from "./data";
import { Avatar, Badge, Tooltip } from "./design/ui";
import { BrandLock, BrandMark } from "./design/Brand";

/**
 * The console shell, for both kinds of administrator.
 *
 * One shell, one design system, two navigations. Which one you get is decided
 * by the scope the server reports, never by anything chosen here — and the
 * navigation is a convenience, not a control: every route behind it is
 * refused server-side for anybody who should not be there.
 *
 * A university admin sees their institution and what is waiting on them
 * today. A platform admin sees the whole platform.
 */

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end: boolean;
  queue?: "verifications" | "reports";
};

const INSTITUTION_NAV: Array<{ group?: string; items: NavItem[] }> = [
  {
    items: [
      { to: "/", label: "Overview", icon: GaugeIcon, end: true },
      { to: "/verifications", label: "Verification", icon: SealCheckIcon, end: false, queue: "verifications" },
      { to: "/members", label: "People", icon: UsersThreeIcon, end: false },
      { to: "/reports", label: "Reports", icon: WarningIcon, end: false, queue: "reports" },
    ],
  },
  {
    group: "Institution",
    items: [{ to: "/campuses", label: "Campuses", icon: BuildingsIcon, end: false }],
  },
];

const PLATFORM_NAV: Array<{ group?: string; items: NavItem[] }> = [
  {
    items: [{ to: "/", label: "Overview", icon: GaugeIcon, end: true }],
  },
  {
    group: "Operations",
    items: [
      { to: "/verifications", label: "Verification", icon: SealCheckIcon, end: false, queue: "verifications" },
      { to: "/reports", label: "Moderation", icon: ShieldCheckIcon, end: false, queue: "reports" },
      { to: "/members", label: "People", icon: UsersThreeIcon, end: false },
    ],
  },
  {
    group: "Platform",
    items: [
      { to: "/institutions", label: "Institutions", icon: BuildingsIcon, end: false },
      { to: "/admins", label: "Administrators", icon: UserGearIcon, end: false },
      { to: "/audit", label: "Audit log", icon: ClipboardTextIcon, end: false },
      { to: "/analytics", label: "Analytics", icon: ChartLineIcon, end: false },
    ],
  },
];

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

export function scopeLabel(admin: AdminMe): string {
  return admin.scope.kind === "platform"
    ? "Super Admin · GoSaath"
    : `University Admin · ${admin.institutionName}`;
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
  const platform = admin.scope.kind === "platform";
  const sections = platform ? PLATFORM_NAV : INSTITUTION_NAV;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("gosaath.admin.sidebar") === "collapsed",
  );
  useEffect(() => {
    localStorage.setItem("gosaath.admin.sidebar", collapsed ? "collapsed" : "open");
  }, [collapsed]);

  // The same cached request the overview makes, so the counts cost nothing.
  // A platform admin's overview is a different endpoint, so the queue counts
  // come from the shared ones they both have.
  const { data: overview } = useQuery("overview", () => api.overview());
  const counts = {
    verifications: overview?.pendingVerifications ?? 0,
    reports: overview?.openReports ?? 0,
  };

  const signOut = useCallback(() => {
    api.signOut();
    onSignedOut();
    navigate("/");
  }, [navigate, onSignedOut]);

  const title =
    sections
      .flatMap((section) => section.items)
      .find((item) =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
      )?.label ?? "Overview";

  return (
    <div className="shell" data-collapsed={collapsed}>
      <aside className="sidebar">
        <div
          className="row"
          style={{
            height: 36,
            paddingLeft: collapsed ? 0 : "var(--space-2)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? (
            <BrandMark size={26} />
          ) : (
            <BrandLock scope={platform ? "Platform" : admin.institutionName} />
          )}
        </div>

        <nav className="stack gap-1" style={{ marginTop: "var(--space-4)" }}>
          {sections.map((section, index) => (
            <div className="stack gap-1" key={section.group ?? index}>
              {section.group && !collapsed ? (
                <p className="nav-group">{section.group}</p>
              ) : section.group ? (
                <div style={{ height: 10 }} />
              ) : null}
              {section.items.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  count={item.queue ? counts[item.queue] : 0}
                />
              ))}
            </div>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <button
            type="button"
            className="nav-link"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <SidebarSimpleIcon size={18} />
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </Tooltip>
      </aside>

      <div className="stack" style={{ minWidth: 0 }}>
        <header className="topbar">
          <div className="row gap-3" style={{ minWidth: 0 }}>
            <h1 className="h1" style={{ fontSize: 17, lineHeight: "24px" }}>
              {title}
            </h1>
            {platform ? <Badge tone="brand">Platform</Badge> : null}
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
                  <span
                    className="stack hide-narrow"
                    style={{ alignItems: "flex-start", gap: 0 }}
                  >
                    <span className="h3">{admin.name}</span>
                    <span className="caption t-3">{scopeLabel(admin)}</span>
                  </span>
                  <CaretUpDownIcon size={14} />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content className="menu" align="end" sideOffset={6}>
                  <div style={{ padding: "var(--space-2) var(--space-3)" }}>
                    <p className="h3">{admin.name}</p>
                    <p className="caption t-3">{admin.email}</p>
                    <p className="caption t-brand" style={{ marginTop: 4, fontWeight: 600 }}>
                      {scopeLabel(admin)}
                    </p>
                  </div>

                  <DropdownMenu.Separator
                    style={{
                      height: 1,
                      background: "var(--border-soft)",
                      margin: "var(--space-1) 0",
                    }}
                  />

                  <DropdownMenu.Item
                    className="menu-item"
                    onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                    {theme === "dark" ? "Light theme" : "Dark theme"}
                  </DropdownMenu.Item>

                  <DropdownMenu.Item className="menu-item menu-item-danger" onSelect={signOut}>
                    <SignOutIcon size={15} />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
}

function NavItemLink({
  item,
  collapsed,
  count,
}: {
  item: NavItem;
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

  return collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link;
}
