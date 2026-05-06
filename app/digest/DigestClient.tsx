"use client";

import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function DigestClient({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `digest-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={copy} variant={copied ? "secondary" : "primary"}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Markdown
            </>
          )}
        </Button>
        <Button onClick={download} variant="secondary">
          <Download className="h-3.5 w-3.5" />
          Download .md
        </Button>
        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
          {markdown.split("\n").length} lines ·{" "}
          {markdown.length.toLocaleString()} chars
        </span>
      </div>

      <Card className="overflow-hidden">
        <pre className="overflow-x-auto bg-zinc-50 p-5 text-xs leading-relaxed dark:bg-zinc-950">
          <code className="font-mono text-zinc-800 dark:text-zinc-200">
            {markdown}
          </code>
        </pre>
      </Card>
    </div>
  );
}
