// GitHub language colors — top 50 most common.
// Source: https://github.com/ozh/github-colors (MIT)
const COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#FA7343",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  Lua: "#000080",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  R: "#198CE7",
  Julia: "#a270ba",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Erlang: "#B83998",
  Clojure: "#db5855",
  OCaml: "#3be133",
  Nim: "#ffc200",
  Zig: "#ec915c",
  Crystal: "#000100",
  Solidity: "#AA6746",
  Move: "#4a137a",
  Cairo: "#ff4a48",
  Vyper: "#fe8b1a",
  Markdown: "#083fa1",
  Jupyter: "#DA5B0B",
  TeX: "#3D6117",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  YAML: "#cb171e",
  PowerShell: "#012456",
  Assembly: "#6E4C13",
  CMake: "#DA3434",
  WebAssembly: "#04133b",
  Roff: "#ecdebe",
  Vim: "#199f4b",
  Nix: "#7e7eff",
  HCL: "#844FBA",
};

export function LanguageDot({
  language,
  size = 10,
}: {
  language: string | null;
  size?: number;
}) {
  if (!language) return null;
  const color = COLORS[language] ?? "#888888";
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/10"
      style={{ width: size, height: size, backgroundColor: color }}
      title={language}
    />
  );
}
