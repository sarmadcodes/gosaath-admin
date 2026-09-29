import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import {
  BuildingsIcon,
  ChartBarIcon,
  SealCheckIcon,
  SignOutIcon,
  UsersIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { api, isSignedIn, type AdminMe } from "./api";
import { SignIn } from "./pages/SignIn";
import { Dashboard } from "./pages/Dashboard";
import { Verifications } from "./pages/Verifications";
import { Members } from "./pages/Members";
import { MemberPage } from "./pages/MemberPage";
import { Reports } from "./pages/Reports";
import { Campuses } from "./pages/Campuses";

/**
 * The panel shell.
 *
 * The role is read from the server on every load rather than from anything
 * stored here, so an admin whose access was removed sees it on the next load
 * instead of operating a panel that only fails when they try to act.
 */
export function App() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(isSignedIn());

  useEffect(() => {
    if (!isSignedIn()) return;
    api
      .me()
      .then(setAdmin)
      .catch(() => {
        api.signOut();
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: "100dvh" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!admin) return <SignIn onSignedIn={setAdmin} />;

  return <Shell admin={admin} onSignedOut={() => setAdmin(null)} />;
}

const NAV = [
  { to: "/", label: "Dashboard", icon: ChartBarIcon, end: true },
  { to: "/verifications", label: "Verification", icon: SealCheckIcon, end: false },
  { to: "/members", label: "Members", icon: UsersIcon, end: false },
  { to: "/reports", label: "Reports", icon: WarningIcon, end: false },
  { to: "/campuses", label: "Campuses", icon: BuildingsIcon, end: false },
];

function Shell({ admin, onSignedOut }: { admin: AdminMe; onSignedOut: () => void }) {
  const navigate = useNavigate();

  const signOut = useCallback(() => {
    api.signOut();
    onSignedOut();
    navigate("/");
  }, [navigate, onSignedOut]);

  return (
    <Flex style={{ minHeight: "100dvh" }}>
      <Box
        style={{
          width: 232,
          flexShrink: 0,
          borderRight: "1px solid var(--gray-a5)",
          padding: "var(--space-4)",
          position: "sticky",
          top: 0,
          height: "100dvh",
        }}
      >
        <Flex direction="column" justify="between" height="100%">
          <Box>
            <Heading size="4" mb="1">
              GoSaath
            </Heading>
            <Text size="1" color="gray">
              {admin.scope.kind === "platform" ? "Platform admin" : "University admin"}
            </Text>

            <Flex direction="column" gap="1" mt="5" asChild>
              <nav>
                {NAV.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-3)",
                      textDecoration: "none",
                      color: isActive ? "var(--accent-11)" : "var(--gray-12)",
                      background: isActive ? "var(--accent-3)" : "transparent",
                      fontSize: "var(--font-size-2)",
                      fontWeight: isActive ? 500 : 400,
                    })}
                  >
                    <Icon size={17} weight={"regular"} />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </Flex>
          </Box>

          <Button variant="soft" color="gray" onClick={signOut}>
            <SignOutIcon size={16} />
            Sign out
          </Button>
        </Flex>
      </Box>

      <Box flexGrow="1" p="6" style={{ maxWidth: 1180 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/verifications" element={<Verifications />} />
          <Route path="/members" element={<Members />} />
          <Route path="/members/:id" element={<MemberPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/campuses" element={<Campuses />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Flex>
  );
}
