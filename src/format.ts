/**
 * How the console words things.
 *
 * The same register as the app: plain, specific, and about people rather
 * than records. An audit action is "member.suspended" in the log and
 * "A member was suspended" on a dashboard, because nobody reads a dashboard
 * to learn our event names.
 */

const ACTIONS: Record<string, string> = {
  "verification.approved": "A verification was approved",
  "verification.rejected": "A verification was rejected",
  "member.suspended": "A member was suspended",
  "member.restored": "A member's access was restored",
  "member.phoneRevealed": "A phone number was revealed",
  "report.actioned": "A report was actioned",
  "report.dismissed": "A report was dismissed",
  "report.escalated": "A report was escalated to the platform team",
  "campus.created": "A campus was added",
  "campus.updated": "A campus was updated",
  "institution.updated": "The institution profile was updated",
};

export function describeAction(action: string): string {
  // Unknown actions still read as English rather than as a key: this list
  // will always lag behind the backend by one deploy at some point.
  return (
    ACTIONS[action] ??
    action
      .replace(/[._]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase())
  );
}

/** "14 minutes ago", the way the app phrases it. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(iso);
}

/** A date as somebody in Karachi reads it, where the pilot is. */
export function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}
