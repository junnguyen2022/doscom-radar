import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/components/providers/AppProvider";
import { Nav } from "@/components/nav/Nav";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Radar — GitHub trending tracker",
  description:
    "Daily snapshots, movers, tech radar, AI insights, 138 curated collections.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('agent.theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppProvider>
          <div className="min-h-screen">
            <Nav />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="animate-fade-in">{children}</div>
            </div>
            <footer className="mt-16 border-t border-zinc-200 dark:border-zinc-800">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-zinc-500 dark:text-zinc-400 sm:px-6 lg:px-8">
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Agent Radar
                  </span>{" "}
                  · GitHub trending tracker · Doscom Holdings
                </div>
                <div>
                  Collections curated by{" "}
                  <a
                    href="https://ossinsight.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline dark:text-brand-400"
                  >
                    OSSInsight
                  </a>{" "}
                  · Apache 2.0
                </div>
              </div>
            </footer>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
