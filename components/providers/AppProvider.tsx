"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/i18n";

type Theme = "light" | "dark";

type AppContextValue = {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  watchlist: string[]; // "owner/repo"
  toggleWatch: (key: string) => void;
  isWatched: (key: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = "agent.theme";
const LANG_KEY = "agent.lang";
const WATCHLIST_KEY = "agent.watchlist";

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [lang, setLangState] = useState<Lang>("vi");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted values once
  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY) as Theme | null;
    const l = localStorage.getItem(LANG_KEY) as Lang | null;
    const w = localStorage.getItem(WATCHLIST_KEY);

    if (t === "dark" || t === "light") setThemeState(t);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      setThemeState("dark");

    if (l === "vi" || l === "en") setLangState(l);

    if (w) {
      try {
        const parsed: unknown = JSON.parse(w);
        if (Array.isArray(parsed)) {
          setWatchlist(parsed.filter((x): x is string => typeof x === "string"));
        }
      } catch {
        /* ignore */
      }
    }

    setHydrated(true);
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, hydrated]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  const toggleWatch = useCallback((key: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isWatched = useCallback(
    (key: string) => watchlist.includes(key),
    [watchlist],
  );

  return (
    <AppContext.Provider
      value={{ theme, lang, setTheme, setLang, watchlist, toggleWatch, isWatched }}
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
