// Brand Core — single source of truth cho 2 thương hiệu của Doscom Holdings.
// Trích từ Brand Foundation sheets (xem docs/brand-core-doscom.md + docs/brand-core-noma.md).
//
// Dùng cho:
//  - Relevance scoring (lib/config/doscom-focus.ts merge techHigh/techMedium vào focus tiers)
//  - Use-case mapping gắn nhãn brand (lib/doscom-usecases.ts)
//  - Brand context bơm vào prompt Claude (lib/insight-contract.ts)
//
// Khi sheet brand đổi → cập nhật docs/*.md + file này (KHÔNG fetch Google Sheets runtime).

export type BrandId = "doscom" | "noma";

export type BrandUseCase = {
  department: string; // phòng ban / mảng áp dụng
  cases: string[]; // 2-3 use case cụ thể
};

export type BrandProfile = {
  id: BrandId;
  name: string; // tên hiển thị (HOA)
  legalName: string;
  business: string; // 1 câu mô tả ngành nghề
  tagline: string;
  // Tín hiệu repo phù hợp brand này (topic/keyword, lowercase).
  techHigh: string[]; // fit mạnh — direct business
  techMedium: string[]; // fit hỗ trợ
  useCases: BrandUseCase[]; // khi repo khớp → gợi ý áp dụng
  redLines: string[]; // guardrail nội dung (cho prompt + content-tool recs)
};

export const BRANDS: Record<BrandId, BrandProfile> = {
  doscom: {
    id: "doscom",
    name: "DOSCOM",
    legalName: "Công ty TNHH Doscom Holdings",
    business:
      "An ninh & bảo mật cá nhân: camera AI, dò camera/máy nghe lén, chống ghi âm, ghi âm, định vị GPS, chuông cửa thông minh, dashcam 4G. Tầm nhìn 2030 dẫn đầu bằng AI.",
    tagline: "Công nghệ thế hệ mới — bán sự an tâm.",
    techHigh: [
      // Computer vision / video analytics — lõi camera an ninh
      "computer-vision",
      "object-detection",
      "face-recognition",
      "face-detection",
      "video-analytics",
      "motion-detection",
      "cctv",
      "surveillance",
      "rtsp",
      "onvif",
      "yolo",
      "image-recognition",
      // AI brain
      "ai-agent",
      "agent",
      "llm",
      "rag",
      "mcp",
      "anomaly-detection",
      // IoT / edge / embedded — thiết bị phần cứng
      "iot",
      "edge",
      "edge-ai",
      "embedded",
      "firmware",
      "esp32",
      "raspberry-pi",
      "mqtt",
      "smart-home",
      "home-automation",
      // Định vị & tracking
      "gps",
      "tracking",
      "geolocation",
      "fleet-management",
      // Privacy / security / signal
      "privacy",
      "security",
      "encryption",
      "signal-processing",
      "audio-processing",
    ],
    techMedium: [
      "automation",
      "workflow",
      "dashboard",
      "analytics",
      "streaming",
      "webrtc",
      "real-time",
      "sensor",
      "bluetooth",
      "zigbee",
    ],
    useCases: [
      {
        department: "R&D thiết bị (Camera AI / Dò sóng / Định vị)",
        cases: [
          "Nhận diện người/chuyển động cho camera an ninh",
          "Phát hiện bất thường (anomaly) từ luồng video/âm thanh",
          "Firmware/edge-AI cho thiết bị IoT chạy offline",
        ],
      },
      {
        department: "Tech / Nền tảng",
        cases: [
          "Agent AI vận hành & hỗ trợ sản phẩm",
          "Pipeline xử lý video/định vị real-time",
        ],
      },
    ],
    redLines: [
      'Không "100% an toàn", "phát hiện 100%", "không thể phát hiện"',
      'Không content "theo dõi/nghe lén người khác" — chỉ "bảo vệ chính mình"',
      'Từ cấm: "rẻ nhất", "theo dõi bí mật", "nghe lén"',
    ],
  },
  noma: {
    id: "noma",
    name: "NOMA",
    legalName: "Công ty TNHH Noma Auto",
    business:
      "Chăm sóc ô tô DIY chuẩn Mỹ (~17 SKU hoá chất). Bán mạnh Shopee (~60%) + TikTok (~30%). Khách: chủ xe tự làm tại nhà.",
    tagline: "Chăm sóc xe chuẩn Mỹ — tự làm tại nhà.",
    techHigh: [
      // Ecommerce / marketplace — kênh bán lõi
      "ecommerce",
      "e-commerce",
      "marketplace",
      "storefront",
      "shopify",
      "woocommerce",
      "cart",
      "checkout",
      "recommendation",
      "pricing",
      "inventory",
      "order-management",
      "fulfillment",
      // Content / social / video — TikTok/Shopee content
      "video-editing",
      "ffmpeg",
      "short-video",
      "social-media",
      "ugc",
      "livestream",
      "affiliate",
      "seo",
      "marketing-automation",
      "content-generation",
      // CSKH
      "chatbot",
      "helpdesk",
      "conversational",
      "crm",
    ],
    techMedium: [
      "automation",
      "workflow",
      "dashboard",
      "analytics",
      "no-code",
      "low-code",
      "newsletter",
      "campaign",
      "image-generation",
    ],
    useCases: [
      {
        department: "TMĐT (Shopee / TikTok Shop)",
        cases: [
          "Đồng bộ đơn/tồn đa sàn",
          "Tối ưu giá & gợi ý sản phẩm",
          "Dashboard doanh thu - hoàn - tồn theo kênh",
        ],
      },
      {
        department: "Marketing / Content",
        cases: [
          "Tự động dựng/biên tập short-video chăm xe",
          "Sinh caption/SEO cho Shopee & TikTok",
          "Quản lý chiến dịch & affiliate/KOC",
        ],
      },
      {
        department: "CSKH",
        cases: [
          "Bot tư vấn cách dùng sản phẩm 24/7",
          "Auto-route khiếu nại theo intent",
        ],
      },
    ],
    redLines: [
      'KHÔNG "Made in USA" / "Chất lượng Mỹ" — sản xuất tại TQ, chỉ "chuẩn mực Mỹ"',
      'Không "xóa hoàn toàn", "100% an toàn", "tốt nhất", "số 1", "bảo vệ vĩnh viễn"',
      'Từ cấm: "rẻ nhất", "siêu rẻ", "hàng xịn", "chính hãng Mỹ", "bảo hành trọn đời"',
    ],
  },
};

export const BRAND_LIST: BrandProfile[] = [BRANDS.doscom, BRANDS.noma];

// Tech AI/ops backbone — phù hợp CẢ hai brand + vận hành Holdings nói chung.
export const HOLDINGS_SHARED_HIGH = [
  "ai-agent",
  "agent",
  "agents",
  "llm",
  "rag",
  "mcp",
  "automation",
  "workflow",
  "internal-tool",
  "no-code",
  "low-code",
  "dashboard",
  "analytics",
  "observability",
];

export const HOLDINGS_SHARED_MEDIUM = [
  "data-pipeline",
  "etl",
  "vector-database",
  "embedding",
  "monitoring",
];

// Off-core cho toàn Holdings — trừ điểm relevance.
export const HOLDINGS_AVOID = [
  "game",
  "gamedev",
  "godot",
  "game-engine",
  "crypto",
  "blockchain",
  "nft",
  "defi",
  "web3",
];

// Gộp toàn bộ tín hiệu tech của các brand (đã dedup) — dùng để làm giàu relevance focus.
export function allBrandTechHigh(): string[] {
  return Array.from(
    new Set([...BRAND_LIST.flatMap((b) => b.techHigh), ...HOLDINGS_SHARED_HIGH]),
  );
}

export function allBrandTechMedium(): string[] {
  return Array.from(
    new Set([
      ...BRAND_LIST.flatMap((b) => b.techMedium),
      ...HOLDINGS_SHARED_MEDIUM,
    ]),
  );
}

// Khối ngữ cảnh brand bơm vào prompt Claude (ngắn, có guardrail).
export function brandContextForPrompt(): string {
  const blocks = BRAND_LIST.map((b) => {
    const depts = b.useCases.map((u) => u.department).join("; ");
    return `### ${b.name} (${b.legalName})
- Ngành: ${b.business}
- Repo phù hợp khi liên quan: ${b.techHigh.slice(0, 12).join(", ")}
- Áp dụng vào: ${depts}
- Red lines: ${b.redLines.join(" · ")}`;
  });
  return blocks.join("\n\n");
}
