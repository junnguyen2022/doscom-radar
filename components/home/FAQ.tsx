"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const ITEMS: { q: string; a: string }[] = [
  {
    q: "Agent Radar là gì?",
    a: "Là dashboard track GitHub trending — snapshot github.com/trending mỗi ngày (daily/weekly/monthly), phân loại tự động repos thành adopt/monitor/caution dựa trên heat score, phát hiện movers (rank delta), và phân loại theo 138 collections curated bởi PingCAP/OSSInsight.",
  },
  {
    q: "Data đến từ đâu?",
    a: "Scrape trực tiếp HTML của github.com/trending bằng cheerio. Cron Vercel chạy daily 01:00 UTC, gọi /api/cron/snapshot, lưu vào Supabase Postgres (production) hoặc JSON file (local demo).",
  },
  {
    q: "Heat score được tính thế nào?",
    a: "Composite của velocity (stars_gained / total_stars) × scale (log10 of total stars) + một chút rank bonus. Kết quả normalize 0-100. Repo nhỏ-spike-mạnh có velocity cao nhưng scale thấp → heat trung bình; repo lớn-active-đều có heat cao.",
  },
  {
    q: "Phân loại Adopt / Monitor / Caution dựa trên gì?",
    a: "Adopt: ≥10k stars + ≥50 stars/day (community endorsed + active). Caution: gained > total × 0.5 (viral spike, base nhỏ) hoặc không detect được ngôn ngữ. Còn lại: Monitor.",
  },
  {
    q: "Tech Radar (Adopt/Trial/Assess/Hold) khác Classification thế nào?",
    a: "Classification (3 tier) phân loại từng repo cho list view. Tech Radar (4 quadrants × 4 rings) là visualization radar plot kiểu ThoughtWorks — quadrant theo loại (Languages/Tools/Platforms/Techniques), ring theo độ trưởng thành. Cả hai chỉ là heuristic, không phải đánh giá team.",
  },
  {
    q: "AI Insight có chính xác không?",
    a: "AI Insight gọi Claude Sonnet với data top trending hôm nay, yêu cầu output 5-8 dòng tiếng Việt phân tích trend. Cache 1 giờ. Coi như second opinion, không phải truth — verify trước khi ra quyết định technical lớn.",
  },
  {
    q: "Watchlist có sync giữa devices không?",
    a: "Không. Lưu trong localStorage của browser hiện tại. Để sync, cần thêm auth (chưa có). Trade-off: không cần signup, không có server-side state để bảo trì.",
  },
  {
    q: "Tự host được không?",
    a: "Được. Project là Next.js 15 + Supabase + Anthropic SDK, MIT license. Cần: Supabase project miễn phí, Vercel account miễn phí, ANTHROPIC_API_KEY (optional cho AI insight). Cron config có sẵn trong vercel.json.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mb-12">
      <h2 className="mb-1 text-2xl font-bold tracking-tight">
        Câu hỏi thường gặp
      </h2>
      <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
        Cách app hoạt động + design rationale.
      </p>

      <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
