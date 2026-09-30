import { BASE, currentAccessToken, isSignedIn } from "./api";
import { refetchMatching } from "./data";

/**
 * The console's live connection.
 *
 * Two administrators working the same verification queue is the ordinary case,
 * not an edge one, and before this the second one would approve a request the
 * first had already handled and get a conflict for their trouble. Now the
 * queue empties under both of them.
 *
 * **Why not `EventSource`.** It cannot set headers, and the access token must
 * travel in the Authorization header rather than a query string that every
 * proxy and access log on the way would keep. So the stream is read with
 * streaming `fetch` and the SSE wire format is parsed here.
 *
 * An event carries a count and an id, never a name, an email or a phone
 * number. It is a signal to refetch, and the refetch goes through the ordinary
 * authorised endpoint — so scope is enforced in exactly one place, by the
 * server, rather than being re-implemented against a payload.
 */

type AdminEvent = { type: string; [key: string]: unknown };

/**
 * Which cached queries an event makes wrong.
 *
 * Keys are prefixes, matching how `useQuery` names things. A verification
 * decision changes the queue, the counts on two different overviews, the
 * member it was about, and the activity feed — miss one and an administrator
 * is looking at a number that disagrees with the list beside it.
 */
const AFFECTS: Record<string, string[]> = {
  "admin.verification.created": [
    "verifications",
    "overview",
    "platform:overview",
  ],
  "admin.verification.updated": [
    "verifications",
    "overview",
    "platform:overview",
    // Covers both "member:<id>" and "members:<query>" — a decision changes the
    // person's row in the directory and their detail page.
    "member",
    "audit",
    "activity",
  ],
  "admin.report.created": ["reports", "overview", "platform:overview"],
  "admin.report.updated": [
    "reports",
    "overview",
    "platform:overview",
    "audit",
    "activity",
  ],
  "admin.member.changed": ["member", "overview", "platform:overview", "audit", "activity"],
  "admin.institution.changed": [
    "institutions",
    "platform:overview",
    "analytics",
    "audit",
    "activity",
  ],
  // The server could not say what was missed, so everything on screen is
  // suspect. The empty prefix matches every key, which is the only honest
  // response available.
  resync: [""],
};

let controller: AbortController | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;
let running = false;
let enabled = false;
let lastEventId: number | null = null;

/**
 * Backoff with jitter.
 *
 * Jitter matters more than the curve: when the server restarts, every open
 * console reconnects at once, and without it they arrive in lockstep and do it
 * again on the next failure.
 */
function backoffMs(): number {
  const base = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
  return base / 2 + Math.random() * (base / 2);
}

function scheduleReconnect(): void {
  if (!enabled || reconnectTimer) return;
  attempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, backoffMs());
}

function apply(event: AdminEvent): void {
  const prefixes = AFFECTS[event.type];
  if (!prefixes) return;
  for (const prefix of prefixes) refetchMatching(prefix);
}

function handleFrame(frame: string): void {
  // A heartbeat is a comment and carries no fields.
  if (frame.startsWith(":")) return;

  let id: number | null = null;
  let data: string | null = null;

  for (const line of frame.split("\n")) {
    if (line.startsWith("id: ")) {
      const parsed = Number(line.slice(4));
      if (Number.isInteger(parsed)) id = parsed;
    } else if (line.startsWith("data: ")) {
      data = line.slice(6);
    }
  }

  if (!data) return;

  let event: AdminEvent;
  try {
    event = JSON.parse(data) as AdminEvent;
  } catch {
    return;
  }

  // Recorded only after the event parsed: resuming past an event we failed to
  // apply would skip it for good.
  if (id !== null) lastEventId = id;

  apply(event);
}

async function connect(): Promise<void> {
  if (!enabled || running) return;
  running = true;
  controller = new AbortController();

  try {
    const token = await currentAccessToken();

    const response = await fetch(`${BASE}/admin/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
        ...(lastEventId === null ? {} : { "Last-Event-ID": String(lastEventId) }),
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      // Signed out, or admin access was revoked while this console sat open.
      // Retrying would be a request a second, forever, against an account that
      // is no longer allowed to have one.
      enabled = false;
      return;
    }

    if (!response.ok || !response.body) {
      scheduleReconnect();
      return;
    }

    attempt = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line, and a partial frame waits for
      // the rest. TCP does not owe us whole messages, and splitting naively
      // drops an event whenever one straddles a packet boundary.
      let split: number;
      while ((split = buffer.indexOf("\n\n")) !== -1) {
        handleFrame(buffer.slice(0, split));
        buffer = buffer.slice(split + 2);
      }
    }

    // A clean close: the server recycles streams before the access token
    // expires. Reconnect promptly rather than backing off.
    if (enabled) {
      attempt = 0;
      scheduleReconnect();
    }
  } catch {
    // Aborted by us, or the network went away. Same response either way.
    scheduleReconnect();
  } finally {
    running = false;
  }
}

/** Starts streaming, once there is a session. Idempotent. */
export function startAdminRealtime(): void {
  if (!isSignedIn()) return;
  enabled = true;
  if (!running && !reconnectTimer) void connect();
}

/** Stops streaming, on sign-out. The next session starts from nothing. */
export function stopAdminRealtime(): void {
  enabled = false;
  lastEventId = null;
  attempt = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  controller?.abort();
  controller = null;
}

/**
 * A tab that was in the background may have been throttled or suspended, and a
 * socket held across that comes back believing it is connected while receiving
 * nothing — the worst failure available here, because the console looks live
 * and is not. Coming back to the tab re-establishes it, and `Last-Event-ID`
 * either fills the gap or the server answers `resync`.
 */
document.addEventListener("visibilitychange", () => {
  if (!enabled || document.visibilityState !== "visible") return;
  attempt = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (!running) void connect();
});
