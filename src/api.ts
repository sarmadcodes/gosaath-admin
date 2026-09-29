/**
 * The backend, as this panel sees it.
 *
 * Two things live here so no screen has to think about them:
 *
 *   Tokens. Login returns a long-lived refresh token; the access token is
 *   short-lived and kept in memory, refreshed on demand and retried once on a
 *   401. A screen never handles either.
 *
 *   Scope. Every endpoint is already scoped by the server to the admin's own
 *   institution. This panel deliberately does not send an institutionId: a
 *   university admin cannot widen their scope, and a panel that passes one
 *   around invites somebody to try.
 */

const BASE = `${(import.meta.env["VITE_API_URL"] ?? "http://localhost:4000").replace(/\/$/, "")}/api/v1`;
const SESSION_KEY = "gosaath.admin.session";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, number | string | boolean>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshToken: string | null = localStorage.getItem(SESSION_KEY);
let accessToken: string | null = null;
let accessExpiresAt = 0;
let refreshing: Promise<string> | null = null;

export function isSignedIn() {
  return refreshToken !== null;
}

function setSession(token: string | null) {
  refreshToken = token;
  accessToken = null;
  accessExpiresAt = 0;
  if (token) localStorage.setItem(SESSION_KEY, token);
  else localStorage.removeItem(SESSION_KEY);
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function send<T>(
  method: Method,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // A network failure is an error, never an empty result. An empty table
    // would claim there is nothing to moderate.
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  if (response.status === 204) return undefined as T;

  const json = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string; details?: Record<string, number | string | boolean> };
  };

  if (!response.ok) {
    throw new ApiError(
      json.error?.message ?? "Something went wrong.",
      response.status,
      json.error?.details,
    );
  }

  return json.data as T;
}

async function currentAccessToken(): Promise<string> {
  if (accessToken && Date.now() < accessExpiresAt) return accessToken;
  if (!refreshToken) throw new ApiError("Sign in to continue.", 401);

  if (!refreshing) {
    refreshing = (async () => {
      const data = await send<{ accessToken: string; expiresInMinutes: number }>(
        "POST",
        "/auth/refresh",
        { token: refreshToken },
      );
      accessToken = data.accessToken;
      // A minute early, so a token never expires mid-request.
      accessExpiresAt = Date.now() + Math.max(1, data.expiresInMinutes - 1) * 60_000;
      return data.accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function authed<T>(method: Method, path: string, body?: unknown): Promise<T> {
  try {
    return await send<T>(method, path, body, await currentAccessToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      accessToken = null;
      accessExpiresAt = 0;
      return send<T>(method, path, body, await currentAccessToken());
    }
    throw error;
  }
}

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return entries.length
    ? `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`
    : "";
};

// ---------------------------------------------------------------------------
// Shapes, as the server returns them
// ---------------------------------------------------------------------------

export type AdminMe = {
  userId: string;
  role: "member" | "universityAdmin" | "superAdmin";
  scope: { kind: "institution"; institutionId: string } | { kind: "platform" };
};

export type Overview = {
  members: number;
  newMembersThisWeek: number;
  activeCommutes: number;
  seatsOffered: number;
  seatsTaken: number;
  pendingVerifications: number;
  openReports: number;
  topAreas: Array<{ area: string; commuters: number }>;
  signupsLast7Days: Array<{ date: string; count: number }>;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  userType: string;
  campusName: string;
  areaName: string;
  badgeStatus: "none" | "pending" | "approved" | "rejected";
  role: string;
  suspended: boolean;
  joinedAt: string;
};

export type MemberDetail = Member & {
  commute: {
    intent: string;
    direction: string;
    days: string[];
    seatsOffered: number | null;
    status: string;
  } | null;
  reportsAgainst: number;
};

export type Verification = {
  id: string;
  name: string;
  email: string;
  userType: string;
  campusName: string;
  documentUrl: string | null;
  requestedAt: string | null;
};

export type Report = {
  id: string;
  reporter: { id: string; name: string };
  reported: { id: string; name: string } | null;
  category: string;
  detail: string | null;
  status: string;
  createdAt: string;
};

export type Campus = {
  id: string;
  name: string;
  areaName: string | null;
  active: boolean;
  members: number;
};

export const REJECTION_REASONS = [
  { value: "document-unreadable", label: "Could not read the document" },
  { value: "document-mismatch", label: "Does not match the account details" },
  { value: "not-a-member", label: "Could not confirm they study or work here" },
  { value: "expired-document", label: "The document has expired" },
  { value: "other", label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export const api = {
  async signIn(email: string, password: string): Promise<AdminMe> {
    const session = await send<{ token: string }>("POST", "/auth/login", {
      email,
      password,
    });
    setSession(session.token);
    try {
      // Role comes from the server, never from what the panel hoped: a member
      // signing in here gets 403 and is told plainly, rather than being shown
      // an admin shell full of failing requests.
      return await authed<AdminMe>("GET", "/admin/me");
    } catch (error) {
      setSession(null);
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError("This account does not have admin access.", 403);
      }
      throw error;
    }
  },

  me: () => authed<AdminMe>("GET", "/admin/me"),

  signOut() {
    const token = refreshToken;
    setSession(null);
    if (token) void send("POST", "/auth/logout", { token }).catch(() => {});
  },

  overview: () => authed<Overview>("GET", "/admin/overview"),

  members: (params: { q?: string; badgeStatus?: string; before?: string; limit?: number }) =>
    authed<Member[]>("GET", `/admin/members${qs({ ...params, limit: params.limit ?? 25 })}`),

  member: (id: string) => authed<MemberDetail>("GET", `/admin/members/${id}`),

  suspendMember: (id: string, reason: string) =>
    authed<Member>("POST", `/admin/members/${id}/suspend`, { reason }),

  restoreMember: (id: string) => authed<Member>("POST", `/admin/members/${id}/restore`),

  revealPhone: (id: string, reason: string) =>
    authed<{ phone: string }>("POST", `/admin/members/${id}/reveal-phone`, { reason }),

  verifications: () => authed<Verification[]>("GET", "/admin/verifications"),

  decideVerification: (
    id: string,
    decision: { approve: boolean; reason?: string; note?: string },
  ) => authed<{ badgeStatus: string }>("POST", `/admin/verifications/${id}/decision`, decision),

  reports: (status?: string) =>
    authed<Report[]>("GET", `/admin/reports${qs({ status, limit: 50 })}`),

  actOnReport: (id: string, action: string, note?: string) =>
    authed<unknown>("POST", `/admin/reports/${id}/action`, {
      action,
      ...(note ? { note } : {}),
    }),

  campuses: () => authed<Campus[]>("GET", "/admin/campuses"),

  createCampus: (name: string) => authed<Campus>("POST", "/admin/campuses", { name }),

  updateCampus: (id: string, patch: { name?: string; active?: boolean; confirm?: boolean }) =>
    authed<Campus>("PATCH", `/admin/campuses/${id}`, patch),
};
