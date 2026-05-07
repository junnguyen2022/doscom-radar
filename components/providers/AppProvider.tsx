"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lang } from "@/lib/i18n";

type Theme = "light" | "dark";

export type AppUser = {
  id: string;
  email: string | null;
  github_username: string | null;
  avatar_url: string | null;
};

type AppContextValue = {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  // Watchlist — server-backed when user logged in, localStorage otherwise.
  watchlist: string[]; // "owner/repo"
  toggleWatch: (key: string) => void;
  isWatched: (key: string) => boolean;
  // Auth
  user: AppUser | null;
  authLoaded: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = "agent.theme";
const LANG_KEY = "agent.lang";
const WATCHLIST_KEY = "agent.watchlist";

function userFromSupabase(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AppUser | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? null,
    github_username:
      (m.user_name as string | undefined) ??
      (m.preferred_username as string | undefined) ??
      null,
    avatar_url: (m.avatar_url as string | undefined) ?? null,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("vi");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const supabase = createClient();

  // Load persisted theme/lang once
  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY) as Theme | null;
    const l = localStorage.getItem(LANG_KEY) as Lang | null;

    if (t === "dark" || t === "light") setThemeState(t);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      setThemeState("dark");

    if (l === "vi" || l === "en") setLangState(l);

    setHydrated(true);
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  // Watch for session changes
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(userFromSupabase(data.user));
      setAuthLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(userFromSupabase(session?.user ?? null));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Load watchlist: server when authenticated, localStorage otherwise.
  // On first login: migrate localStorage → server then clear localStorage.
  useEffect(() => {
    if (!authLoaded || !hydrated) return;

    if (user) {
      // Try migrate localStorage → server
      const localRaw = localStorage.getItem(WATCHLIST_KEY);
      const localList: string[] = (() => {
        if (!localRaw) return [];
        try {
          const p: unknown = JSON.parse(localRaw);
          return Array.isArray(p)
            ? p.filter((x): x is string => typeof x === "string")
            : [];
        } catch {
          return [];
        }
      })();

      (async () => {
        // If localStorage has entries, push them to server (best-effort)
        if (localList.length > 0) {
          for (const key of localList) {
            const [owner, repo] = key.split("/");
            if (!owner || !repo) continue;
            try {
              await fetch("/api/watchlists/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo, status: "follow" }),
              });
            } catch {
              /* ignore individual failures */
            }
          }
          // Clear localStorage after migration
          localStorage.removeItem(WATCHLIST_KEY);
        }

        // Fetch authoritative list from server
        try {
          const res = await fetch("/api/watchlists/items", {
            cache: "no-store",
          });
          if (res.ok) {
            const j = (await res.json()) as {
              items: { owner: string; repo: string }[];
            };
            setWatchlist(j.items.map((i) => `${i.owner}/${i.repo}`));
          }
        } catch {
          /* ignore */
        }
      })();
    } else {
      // Not authenticated — load from localStorage
      const w = localStorage.getItem(WATCHLIST_KEY);
      if (w) {
        try {
          const parsed: unknown = JSON.parse(w);
          if (Array.isArray(parsed)) {
            setWatchlist(
              parsed.filter((x): x is string => typeof x === "string"),
            );
          }
        } catch {
          /* ignore */
        }
      } else {
        setWatchlist([]);
      }
    }
  }, [user, authLoaded, hydrated]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const toggleWatch = useCallback(
    (key: string) => {
      const [owner, repo] = key.split("/");
      if (!owner || !repo) return;

      setWatchlist((prev) => {
        const watching = prev.includes(key);
        const next = watching
          ? prev.filter((k) => k !== key)
          : [...prev, key];

        if (user) {
          // Server-backed
          if (watching) {
            void fetch(
              `/api/watchlists/items?owner=${owner}&repo=${repo}`,
              { method: "DELETE" },
            );
          } else {
            void fetch("/api/watchlists/items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ owner, repo, status: "follow" }),
            });
          }
        } else {
          // localStorage
          localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
        }

        return next;
      });
    },
    [user],
  );

  const isWatched = useCallback(
    (key: string) => watchlist.includes(key),
    [watchlist],
  );

  return (
    <AppContext.Provider
      value={{
        theme,
        lang,
        setTheme,
        setLang,
        watchlist,
        toggleWatch,
        isWatched,
        user,
        authLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
