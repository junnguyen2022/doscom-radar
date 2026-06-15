"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  FolderKanban,
  Code2,
  Radar,
  GitCompare,
  Star,
  FileText,
  Settings,
  MessageSquare,
  Moon,
  Sun,
  Languages,
  ListChecks,
  Newspaper,
  LogIn,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { t, type DictKey } from "@/lib/i18n";

const ITEMS: { href: string; key: DictKey; icon: LucideIcon }[] = [
  { href: "/", key: "nav_dashboard", icon: LayoutDashboard },
  { href: "/trending", key: "nav_trending", icon: TrendingUp },
  { href: "/movers", key: "nav_movers", icon: Activity },
  { href: "/collections", key: "nav_collections", icon: FolderKanban },
  { href: "/languages", key: "nav_languages", icon: Code2 },
  { href: "/radar", key: "nav_radar", icon: Radar },
  { href: "/compare", key: "nav_compare", icon: GitCompare },
  { href: "/watchlist", key: "nav_watchlist", icon: Star },
  { href: "/decisions", key: "nav_decisions", icon: ListChecks },
  { href: "/ai-news", key: "nav_ai_news", icon: Newspaper },
  { href: "/digest", key: "nav_digest", icon: FileText },
  { href: "/settings", key: "nav_settings", icon: Settings },
  { href: "/chat", key: "nav_chat", icon: MessageSquare },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme, lang, setLang, user } = useApp();

  return (
    <nav className="glass sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex w-full flex-wrap items-center gap-1 px-4 py-2.5 sm:px-6 lg:px-10 2xl:px-16">
        <Link
          href="/"
          className="mr-3 flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <Radar className="h-4 w-4" />
          </span>
          <span className="text-zinc-900 dark:text-zinc-50">Agent Radar</span>
        </Link>

        <ul className="flex flex-wrap items-center gap-0.5 text-sm">
          {ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    active
                      ? "inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1.5 font-medium text-white shadow-sm dark:bg-brand-500"
                      : "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t(item.key, lang)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          {user ? (
            <form action="/api/auth/signout" method="post" className="inline-flex">
              <div className="flex items-center gap-2 rounded-md border border-zinc-200 pl-1 pr-1 dark:border-zinc-700">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.github_username ?? "user"}
                    className="h-5 w-5 rounded-full"
                  />
                ) : null}
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {user.github_username ?? user.email?.split("@")[0]}
                </span>
                <button
                  type="submit"
                  title="Sign out"
                  className="inline-flex h-5 w-5 items-center justify-center text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <LogIn className="h-3 w-3" />
              {t("nav_login", lang)}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-mono font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle language"
          >
            <Languages className="h-3 w-3" />
            <span>{lang.toUpperCase()}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
