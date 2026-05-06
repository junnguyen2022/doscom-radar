// Tech Radar — assigns repos to (quadrant, ring) coordinates.
// ThoughtWorks-style: 4 quadrants × 4 rings.

import { computeHeat } from "./heat";

export type Quadrant =
  | "languages"
  | "tools"
  | "platforms"
  | "techniques";

export type Ring = "adopt" | "trial" | "assess" | "hold";

export const QUADRANT_LABEL: Record<Quadrant, { vi: string; en: string }> = {
  languages: { vi: "Ngôn ngữ & Framework", en: "Languages & Frameworks" },
  tools: { vi: "Công cụ", en: "Tools" },
  platforms: { vi: "Nền tảng", en: "Platforms" },
  techniques: { vi: "Kỹ thuật", en: "Techniques" },
};

export const RING_LABEL: Record<Ring, { vi: string; en: string }> = {
  adopt: { vi: "Adopt", en: "Adopt" },
  trial: { vi: "Trial", en: "Trial" },
  assess: { vi: "Assess", en: "Assess" },
  hold: { vi: "Hold", en: "Hold" },
};

export const RING_COLOR: Record<Ring, string> = {
  adopt: "#10b981", // emerald
  trial: "#3b82f6", // blue
  assess: "#f59e0b", // amber
  hold: "#ef4444", // red
};

const TOOL_KEYWORDS = [
  "cli",
  "command-line",
  "terminal",
  "tui",
  "ide",
  "editor",
  "extension",
  "plugin",
  "agent",
  "tool ",
  " tool",
  "scanner",
  "linter",
  "formatter",
  "debugger",
  "profiler",
];

const PLATFORM_KEYWORDS = [
  "platform",
  "runtime",
  "kubernetes",
  "k8s",
  "docker",
  "container",
  "serverless",
  "infrastructure",
  "host",
  "cloud",
  "deployment",
  "orchestration",
  "swarm",
];

const TECHNIQUE_KEYWORDS = [
  "framework",
  "approach",
  "pattern",
  "architecture",
  "methodology",
  "rag",
  "fine-tun",
  "training",
  "model",
  "research",
  "paper",
  "implementation of",
  "reference",
];

function detectQuadrant(input: {
  language: string | null;
  description: string | null;
  repo: string;
}): Quadrant {
  const desc = (input.description ?? "").toLowerCase();
  const repo = input.repo.toLowerCase();
  const haystack = `${desc} ${repo}`;

  const hits = (kws: string[]) => kws.some((k) => haystack.includes(k));

  // Order matters — most specific first.
  if (hits(PLATFORM_KEYWORDS)) return "platforms";
  if (hits(TECHNIQUE_KEYWORDS)) return "techniques";
  if (hits(TOOL_KEYWORDS)) return "tools";

  // Default: anything with a recognized programming language
  if (input.language) return "languages";

  // No language + no keyword match → techniques (research/papers/specs often have no lang)
  return "techniques";
}

function detectRing(heat: number, totalStars: number): Ring {
  if (heat >= 75 && totalStars >= 10_000) return "adopt";
  if (heat >= 55) return "trial";
  if (heat >= 30) return "assess";
  return "hold";
}

export type RadarPoint = {
  owner: string;
  repo: string;
  url: string;
  language: string | null;
  totalStars: number | null;
  starsGained: number | null;
  heat: number;
  quadrant: Quadrant;
  ring: Ring;
};

export function placeOnRadar(input: {
  owner: string;
  repo: string;
  url: string;
  language: string | null;
  description: string | null;
  totalStars: number | null;
  starsGained: number | null;
  rank: number;
}): RadarPoint {
  const heat = computeHeat({
    starsGained: input.starsGained,
    totalStars: input.totalStars,
    rank: input.rank,
  });
  const quadrant = detectQuadrant(input);
  const ring = detectRing(heat, input.totalStars ?? 0);
  return {
    owner: input.owner,
    repo: input.repo,
    url: input.url,
    language: input.language,
    totalStars: input.totalStars,
    starsGained: input.starsGained,
    heat,
    quadrant,
    ring,
  };
}

// Deterministic position within quadrant ring — based on owner/repo hash.
// Returns (x, y) in unit space [-1, 1].
export function radarCoord(point: RadarPoint): { x: number; y: number } {
  const QUADRANT_ANGLE: Record<Quadrant, [number, number]> = {
    languages: [Math.PI * 1.5, Math.PI * 2.0], // top-right (clockwise from top)
    tools: [Math.PI * 1.0, Math.PI * 1.5], // top-left
    platforms: [Math.PI * 0.5, Math.PI * 1.0], // bottom-left
    techniques: [Math.PI * 0.0, Math.PI * 0.5], // bottom-right
  };

  const RING_RADIUS: Record<Ring, [number, number]> = {
    adopt: [0.05, 0.3],
    trial: [0.32, 0.55],
    assess: [0.57, 0.78],
    hold: [0.8, 0.97],
  };

  const seed = hash(`${point.owner}/${point.repo}`);
  const [a0, a1] = QUADRANT_ANGLE[point.quadrant];
  const [r0, r1] = RING_RADIUS[point.ring];

  // Pad inward 10% to avoid boundary collisions
  const tA = ((seed % 1000) / 1000) * 0.8 + 0.1;
  const tR = (((seed >> 10) % 1000) / 1000) * 0.8 + 0.1;
  const angle = a0 + (a1 - a0) * tA;
  const radius = r0 + (r1 - r0) * tR;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
