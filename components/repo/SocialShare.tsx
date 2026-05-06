"use client";

import { useEffect, useState } from "react";
const X_ICON = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LINKEDIN_ICON = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const REDDIT_ICON = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
    <path d="M12 0a12 12 0 100 24 12 12 0 000-24zm5.5 12.5a1.5 1.5 0 11-2.83.7c-.97.65-2.27 1.07-3.67 1.13l.79-3.74 2.59.55a1 1 0 101.04-1.42 1 1 0 00-1.78.16l-2.89-.6a.5.5 0 00-.6.4l-.86 4.06c-1.42-.06-2.74-.48-3.7-1.14a1.5 1.5 0 11-1.7-.94 1.5 1.5 0 011.93 1.43c1.13.83 2.78 1.27 4.5 1.27s3.36-.44 4.5-1.27a1.5 1.5 0 011.68-1.66zM9 13a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

export function SocialShare({
  text,
  path,
}: {
  text: string;
  path: string;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}${path}` : path;

  const links = [
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: X_ICON,
      color:
        "hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      icon: LINKEDIN_ICON,
      color: "hover:bg-blue-600 hover:text-white",
    },
    {
      name: "Reddit",
      href: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      icon: REDDIT_ICON,
      color: "hover:bg-orange-500 hover:text-white",
    },
  ];

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">Share:</span>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Share on ${l.name}`}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 transition-colors dark:border-zinc-700 dark:text-zinc-400 ${l.color}`}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
