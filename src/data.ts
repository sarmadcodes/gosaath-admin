import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small cache in front of the API.
 *
 * Two things make the console feel fast, and neither is animation:
 *
 *   Going back to a list you were just on shows it immediately, with a quiet
 *   refetch behind it. A spinner on a list the browser rendered ten seconds
 *   ago is the single most obvious "this is a web page, not an app" tell.
 *
 *   Two components asking for the same thing at the same moment make one
 *   request. The overview asks for pending counts and so does the sidebar.
 *
 * Deliberately not a caching library. This is about forty lines and does
 * exactly what this panel needs; TanStack Query can replace it the day
 * something here is genuinely insufficient.
 */

type Entry = { value: unknown; at: number; inflight?: Promise<unknown> };

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

/**
 * Refetchers for the queries currently on screen.
 *
 * `invalidate` is right when a value is known to be wrong and nobody is
 * looking; a live event is the opposite case — something changed and somebody
 * IS looking, so the cache entry must be replaced rather than emptied.
 * Clearing it instead would blank the list and then fill it, which is a worse
 * answer than the stale row it replaced.
 */
const refetchers = new Map<string, Set<() => void>>();

/** How long a cached value is served before a refetch is triggered behind it. */
const STALE_MS = 30_000;

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      notify(key);
    }
  }
}

/** Replaces a cached value outright, for an update already known to have landed. */
export function setCached<T>(key: string, value: T) {
  cache.set(key, { value, at: Date.now() });
  notify(key);
}

async function load<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  // Someone else already asked. Wait for their answer instead of asking again.
  if (existing?.inflight) return existing.inflight as Promise<T>;

  const inflight = fetcher()
    .then((value) => {
      cache.set(key, { value, at: Date.now() });
      notify(key);
      return value;
    })
    .catch((error: unknown) => {
      const current = cache.get(key);
      if (current) delete current.inflight;
      throw error;
    });

  cache.set(key, { ...(existing ?? { value: undefined, at: 0 }), inflight });
  return inflight;
}

/**
 * Quietly refreshes every mounted query whose key starts with `prefix`.
 *
 * Called when the server says something changed. Silent: what is on screen
 * stays there and is swapped when the new data lands, so a verification queue
 * updating under an administrator's cursor never flashes a skeleton.
 */
export function refetchMatching(prefix: string) {
  for (const [key, set] of refetchers) {
    if (!key.startsWith(prefix)) continue;
    // Dropped so the refetch actually goes to the server rather than being
    // served the value that just became wrong.
    cache.delete(key);
    set.forEach((refetch) => refetch());
  }
}

export function useQuery<T>(key: string, fetcher: () => Promise<T>) {
  const cached = cache.get(key);
  const [value, setValue] = useState<T | undefined>(cached?.value as T | undefined);
  const [loading, setLoading] = useState(cached?.value === undefined);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        setValue(await load(key, fetcherRef.current));
      } catch (caught) {
        // A failed background refresh keeps what is on screen. The error
        // state is for when there is nothing to show.
        if (!silent) setError(caught instanceof Error ? caught : new Error("Failed"));
      } finally {
        setLoading(false);
      }
    },
    [key],
  );

  useEffect(() => {
    const listener = () => {
      const entry = cache.get(key);
      setValue(entry?.value as T | undefined);
      if (entry?.value !== undefined) setLoading(false);
    };
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(listener);

    const refetch = () => void run(true);
    let live = refetchers.get(key);
    if (!live) {
      live = new Set();
      refetchers.set(key, live);
    }
    live.add(refetch);

    const entry = cache.get(key);
    const fresh = entry && entry.value !== undefined && Date.now() - entry.at < STALE_MS;
    if (entry?.value !== undefined) {
      setValue(entry.value as T);
      setLoading(false);
    }
    // Fresh enough: show it and leave the server alone.
    if (!fresh) void run(entry?.value !== undefined);

    return () => {
      set!.delete(listener);
      if (set!.size === 0) listeners.delete(key);
      live!.delete(refetch);
      if (live!.size === 0) refetchers.delete(key);
    };
  }, [key, run]);

  const reload = useCallback(() => {
    cache.delete(key);
    return run(false);
  }, [key, run]);

  return { data: value, loading, error, reload };
}
