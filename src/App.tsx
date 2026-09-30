import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, isSignedIn, type AdminMe } from "./api";
import { startAdminRealtime, stopAdminRealtime } from "./realtime";
import { Shell } from "./Shell";
import { Skeleton, ToastProvider, TooltipProvider } from "./design/ui";
import { SignIn } from "./pages/SignIn";
import { Overview } from "./pages/Overview";
import { Verification } from "./pages/Verification";
import { People } from "./pages/People";
import { PersonPage } from "./pages/PersonPage";
import { Moderation } from "./pages/Moderation";
import { Campuses } from "./pages/Campuses";
import { PlatformOverview } from "./pages/platform/PlatformOverview";
import { Institutions } from "./pages/platform/Institutions";
import { Administrators } from "./pages/platform/Administrators";
import { AuditLog } from "./pages/platform/AuditLog";
import { Analytics } from "./pages/platform/Analytics";

/**
 * The panel.
 *
 * One sign-in, two consoles. Which routes exist at all is decided by the
 * scope the server reported, and the routing is a convenience rather than a
 * control: every endpoint behind these screens is refused server-side for
 * anybody outside that scope, so a platform route reached by typing its URL
 * renders a page whose every request comes back 403.
 *
 * Who the admin is, and what they may see, is read from the server on every
 * load rather than from anything kept here. An administrator whose access
 * was removed finds out on their next load, instead of operating a console
 * that only fails when they try to act.
 */
export function App() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [checking, setChecking] = useState(isSignedIn());

  useEffect(() => {
    if (!isSignedIn()) return;
    api
      .me()
      .then(setAdmin)
      .catch(() => {
        api.signOut();
        setAdmin(null);
      })
      .finally(() => setChecking(false));
  }, []);

  // The live stream follows the session rather than any one screen, so there
  // is no path to a signed-in console with no stream — or a signed-out one
  // still holding a connection to an institution it may no longer administer.
  useEffect(() => {
    if (admin) startAdminRealtime();
    else stopAdminRealtime();
    return () => stopAdminRealtime();
  }, [admin]);

  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        {checking ? (
          <BootSkeleton />
        ) : !admin ? (
          <SignIn onSignedIn={setAdmin} />
        ) : (
          <Shell admin={admin} onSignedOut={() => setAdmin(null)}>
            {admin.scope.kind === "platform" ? (
              <Routes>
                <Route path="/" element={<PlatformOverview />} />
                <Route path="/verifications" element={<Verification />} />
                <Route path="/reports" element={<Moderation />} />
                <Route path="/members" element={<People admin={admin} />} />
                <Route path="/members/:id" element={<PersonPage />} />
                <Route path="/institutions" element={<Institutions />} />
                <Route path="/admins" element={<Administrators />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/" element={<Overview admin={admin} />} />
                <Route path="/verifications" element={<Verification />} />
                <Route path="/members" element={<People admin={admin} />} />
                <Route path="/members/:id" element={<PersonPage />} />
                <Route path="/reports" element={<Moderation />} />
                <Route path="/campuses" element={<Campuses />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </Shell>
        )}
      </ToastProvider>
    </TooltipProvider>
  );
}

/**
 * The first moment, before we know whether there is a session.
 *
 * Shaped like the shell that is about to appear rather than a spinner in the
 * middle of an empty page, so the console does not visibly assemble itself.
 */
function BootSkeleton() {
  return (
    <div className="shell" data-collapsed="false">
      <aside className="sidebar">
        <Skeleton width={120} height={26} radius="var(--radius-md)" />
        <div className="stack gap-2" style={{ marginTop: "var(--space-6)" }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} height={30} radius="var(--radius-md)" />
          ))}
        </div>
      </aside>
      <div>
        <div className="topbar">
          <Skeleton width={140} height={20} />
        </div>
        <div className="page stack gap-4">
          <Skeleton width={220} height={30} />
          <Skeleton height={120} radius="var(--radius-lg)" />
        </div>
      </div>
    </div>
  );
}
