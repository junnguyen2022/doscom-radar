"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatUI() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        setMessages([
          ...next,
          { role: "assistant", content: `Error: ${res.status}` },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const block = JSON.parse(line);
            if (block.type === "text") assistant += block.text;
          } catch {
            // skip malformed line
          }
        }
        setMessages([...next, { role: "assistant", content: assistant }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="min-h-[300px] space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span
              className={`inline-block max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left text-sm text-gray-500">thinking…</div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
          placeholder="Ask the agent…"
          disabled={loading}
        />
        <button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
