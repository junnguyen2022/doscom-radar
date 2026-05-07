export type Lang = "vi" | "en";

export const DICT = {
  // Nav
  nav_dashboard: { vi: "Tổng quan", en: "Dashboard" },
  nav_trending: { vi: "Trending", en: "Trending" },
  nav_movers: { vi: "Biến động", en: "Movers" },
  nav_radar: { vi: "Tech Radar", en: "Tech Radar" },
  nav_watchlist: { vi: "Theo dõi", en: "Watchlist" },
  nav_digest: { vi: "Bản tin", en: "Digest" },
  nav_settings: { vi: "Cấu hình", en: "Settings" },
  nav_chat: { vi: "Chat", en: "Chat" },
  nav_collections: { vi: "Collections", en: "Collections" },
  nav_compare: { vi: "So sánh", en: "Compare" },
  nav_languages: { vi: "Ngôn ngữ", en: "Languages" },
  nav_decisions: { vi: "Decisions", en: "Decisions" },
  nav_login: { vi: "Đăng nhập", en: "Sign in" },
  nav_logout: { vi: "Đăng xuất", en: "Sign out" },

  // Common
  today: { vi: "Hôm nay", en: "Today" },
  this_week: { vi: "Tuần này", en: "This week" },
  this_month: { vi: "Tháng này", en: "This month" },
  no_data: { vi: "Chưa có dữ liệu", en: "No data" },
  loading: { vi: "Đang tải...", en: "Loading..." },
  total_stars: { vi: "Tổng sao", en: "Total stars" },
  stars_gained: { vi: "Sao mới", en: "Stars gained" },
  heat: { vi: "Heat", en: "Heat" },
  rank: { vi: "Hạng", en: "Rank" },
  language: { vi: "Ngôn ngữ", en: "Language" },

  // Filters
  filters: { vi: "Bộ lọc", en: "Filters" },
  search_placeholder: { vi: "Tìm theo owner/repo...", en: "Search owner/repo..." },
  min_total_stars: { vi: "Sao tối thiểu", en: "Min total stars" },
  min_gained: { vi: "Sao mới tối thiểu", en: "Min gained" },
  sort_by: { vi: "Sắp xếp", en: "Sort by" },
  reset: { vi: "Reset", en: "Reset" },
  apply: { vi: "Áp dụng", en: "Apply" },
  show_top: { vi: "Hiện top", en: "Show top" },
  all: { vi: "Tất cả", en: "All" },

  // Classification
  cls_adopt: { vi: "Có thể adopt", en: "Adopt" },
  cls_monitor: { vi: "Đáng theo dõi", en: "Monitor" },
  cls_caution: { vi: "Cẩn trọng", en: "Caution" },

  // Movers
  movers_new: { vi: "🆕 Mới", en: "🆕 New" },
  movers_risers: { vi: "▲ Tăng hạng", en: "▲ Risers" },
  movers_fallers: { vi: "▼ Tụt hạng", en: "▼ Fallers" },
  movers_dropped: { vi: "❌ Rớt khỏi top", en: "❌ Dropped" },

  // Watchlist
  watchlist_empty: {
    vi: "Chưa pin repo nào. Click ★ trên bất kỳ repo để theo dõi.",
    en: "No repos pinned. Click ★ on any repo to add it.",
  },
  pin: { vi: "Pin", en: "Pin" },
  unpin: { vi: "Bỏ pin", en: "Unpin" },

  // Digest
  copy_md: { vi: "Copy Markdown", en: "Copy Markdown" },
  copied: { vi: "Đã copy!", en: "Copied!" },

  // Settings
  manual_snapshot: { vi: "Chạy snapshot thủ công", en: "Run snapshot now" },
  snapshot_running: { vi: "Đang chạy...", en: "Running..." },
  backend_status: { vi: "Backend", en: "Backend" },
  last_snapshot: { vi: "Snapshot gần nhất", en: "Last snapshot" },
  next_cron: { vi: "Cron tiếp theo", en: "Next cron" },

  // AI insight
  ai_insight: { vi: "AI Insight hôm nay", en: "AI insight" },
  ai_loading: { vi: "Claude đang phân tích...", en: "Claude analyzing..." },

  // Tech radar
  radar_title: { vi: "Tech Radar", en: "Tech Radar" },
  radar_intro: {
    vi: "Phân loại repos theo quadrant (Languages/Tools/Platforms/Techniques) × ring (Adopt/Trial/Assess/Hold).",
    en: "Repos placed on quadrants (Languages/Tools/Platforms/Techniques) × rings (Adopt/Trial/Assess/Hold).",
  },
} as const;

export type DictKey = keyof typeof DICT;

export function t(key: DictKey, lang: Lang): string {
  return DICT[key][lang];
}
