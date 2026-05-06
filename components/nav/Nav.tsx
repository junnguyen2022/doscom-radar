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
  { href: "/digest", key: "nav_digest", icon: FileText },
  { href: "/settings", key: "nav_settings", icon: Settings },
  { href: "/chat", key: "nav_chat", icon: MessageSquare },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme, lang, setLang } = useApp();

  return (
    <nav className="glass sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2.5 sm:px-6 lg:px-8">
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
