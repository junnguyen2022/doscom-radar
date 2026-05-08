// V2.5 §24.4 — extract structured profile from raw README markdown.
// Heuristic, no AI. Fallback gracefully — never throws.

export type ReadmeProfile = {
  overview: string;
  problemSolved?: string;
  keyFeatures: string[];
  commonUseCases: string[];
  installation?: string;
  usage?: string;
  docsLinks: string[];
  confidence: "high" | "medium" | "low";
  missingData: string[];
};

const HEADING_GROUPS: { keys: string[]; bucket: keyof Sections }[] = [
  {
    keys: [
      "overview",
      "about",
      "introduction",
      "what is",
      "what's this",
      "why",
      "description",
    ],
    bucket: "overview",
  },
  {
    keys: ["problem", "the problem", "motivation", "background"],
    bucket: "problem",
  },
  {
    keys: [
      "features",
      "key features",
      "highlights",
      "capabilities",
      "what it does",
    ],
    bucket: "features",
  },
  {
    keys: [
      "use cases",
      "use case",
      "examples",
      "applications",
      "what can you build",
      "scenarios",
    ],
    bucket: "useCases",
  },
  {
    keys: [
      "installation",
      "install",
      "getting started",
      "quick start",
      "quickstart",
      "setup",
    ],
    bucket: "installation",
  },
  {
    keys: [
      "usage",
      "how to use",
      "basic usage",
      "example",
      "examples",
      "demo",
    ],
    bucket: "usage",
  },
  {
    keys: ["documentation", "docs", "learn more", "resources", "links"],
    bucket: "docs",
  },
];

type Sections = {
  overview: string[];
  problem: string[];
  features: string[];
  useCases: string[];
  installation: string[];
  usage: string[];
  docs: string[];
};

function emptySections(): Sections {
  return {
    overview: [],
    problem: [],
    features: [],
    useCases: [],
    installation: [],
    usage: [],
    docs: [],
  };
}

// Strip badges, HTML tags, image links, and inline html that hurt readability.
function cleanLine(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/<[^>]+>/g, "") // html tags
    .replace(/\s{2,}/g, " ")
    .trim();
}

function classifyHeading(text: string): keyof Sections | null {
  const t = text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
  for (const grp of HEADING_GROUPS) {
    for (const k of grp.keys) {
      if (t === k || t.startsWith(k + " ") || t.endsWith(" " + k)) {
        return grp.bucket;
      }
    }
  }
  return null;
}

function splitMarkdownIntoSections(md: string): Sections {
  const lines = md.split(/\r?\n/);
  const sections = emptySections();
  let current: keyof Sections | "preamble" = "preamble";
  const preamble: string[] = [];

  for (const raw of lines) {
    const line = raw;
    const headMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headMatch) {
      const heading = headMatch[2];
      const bucket = classifyHeading(heading);
      current = bucket ?? "preamble";
      continue;
    }
    if (current === "preamble") {
      preamble.push(line);
    } else {
      sections[current].push(line);
    }
  }

  if (sections.overview.length === 0 && preamble.length > 0) {
    sections.overview = preamble;
  }
  return sections;
}

function firstParagraph(lines: string[], maxChars = 320): string {
  const out: string[] = [];
  let len = 0;
  for (const raw of lines) {
    const cleaned = cleanLine(raw);
    if (!cleaned) {
      if (out.length > 0) break;
      continue;
    }
    if (cleaned.startsWith("```") || cleaned.startsWith("---")) {
      if (out.length > 0) break;
      continue;
    }
    out.push(cleaned);
    len += cleaned.length;
    if (len >= maxChars) break;
  }
  return out.join(" ").slice(0, maxChars).trim();
}

function bulletsFrom(lines: string[], maxItems = 8): string[] {
  const items: string[] = [];
  for (const raw of lines) {
    const m = raw.match(/^\s*[-*+•]\s+(.+)/);
    if (m) {
      const cleaned = cleanLine(m[1]);
      if (cleaned) items.push(cleaned);
    }
    if (items.length >= maxItems) break;
  }
  return items;
}

function extractDocsLinks(lines: string[], maxItems = 6): string[] {
  const out: string[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  for (const raw of lines) {
    let m;
    while ((m = linkRe.exec(raw))) {
      out.push(m[2]);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}

function firstFencedBlock(lines: string[]): string | undefined {
  let inFence = false;
  const buf: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (inFence) {
        return buf.join("\n").trim() || undefined;
      }
      inFence = true;
      continue;
    }
    if (inFence) {
      buf.push(line);
      if (buf.length > 12) {
        return buf.join("\n").trim() || undefined;
      }
    }
  }
  return undefined;
}

export function extractReadmeProfile(markdown: string): ReadmeProfile {
  const sections = splitMarkdownIntoSections(markdown);

  const overview = firstParagraph(sections.overview);
  const problemSolved = sections.problem.length
    ? firstParagraph(sections.problem, 240)
    : undefined;

  let keyFeatures = bulletsFrom(sections.features);
  if (keyFeatures.length === 0) {
    // fallback: first bullet block anywhere
    keyFeatures = bulletsFrom(
      [...sections.overview, ...sections.useCases, ...sections.usage],
      6,
    );
  }
  const commonUseCases = bulletsFrom(sections.useCases, 6);

  const installation = sections.installation.length
    ? firstFencedBlock(sections.installation) ??
      firstParagraph(sections.installation, 200)
    : undefined;

  const usage = sections.usage.length
    ? firstFencedBlock(sections.usage) ?? firstParagraph(sections.usage, 200)
    : undefined;

  const docsLinks = extractDocsLinks(
    sections.docs.length > 0 ? sections.docs : sections.overview,
  );

  const missingData: string[] = [];
  if (!overview) missingData.push("overview");
  if (keyFeatures.length === 0) missingData.push("features");
  if (commonUseCases.length === 0) missingData.push("use_cases");
  if (!installation) missingData.push("installation");
  if (!usage) missingData.push("usage");

  let confidence: "high" | "medium" | "low" = "high";
  if (missingData.length >= 3) confidence = "low";
  else if (missingData.length >= 1) confidence = "medium";

  return {
    overview: overview || "(README không có phần Overview rõ ràng.)",
    problemSolved,
    keyFeatures,
    commonUseCases,
    installation,
    usage,
    docsLinks,
    confidence,
    missingData,
  };
}
