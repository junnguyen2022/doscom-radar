import { ChatUI } from "@/components/chat/ChatUI";

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Agent Chat</h1>
      <ChatUI />
    </main>
  );
}
