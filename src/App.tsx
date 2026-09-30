import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, isSignedIn, type AdminMe } from "./api";
import { Shell } from "./Shell";
import { Skeleton, ToastProvider, TooltipProvider } from "./design/ui";
import { SignIn } from "./pages/SignIn";
import { Overview } from "./pages/Overview";
import { Verification } from "./pages/Verification";
import { People } from "./pages/People";
import { PersonPage } from "./pages/PersonPage";
import { Moderation } from "./pages/Moderation";
import { Campuses } from "./pages/Campuses";

/**
 * The panel.
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

  return (
    <TooltipProvider delayDuration={300}>
      <ToastProvider>
        {checking ? (
          <BootSkeleton />
        ) : !admin ? (
          <SignIn onSignedIn={setAdmin} />
        ) : (
          <Shell admin={admin} onSignedOut={() => setAdmin(null)}>
            <Routes>
              <Route path="/" element={<Overview admin={admin} />} />
              <Route path="/verifications" element={<Verification />} />
              <Route path="/members" element={<People />} />
              <Route path="/members/:id" element={<PersonPage />} />
              <Route path="/reports" element={<Moderation />} />
              <Route path="/campuses" element={<Campuses />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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
