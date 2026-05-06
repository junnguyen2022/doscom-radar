import Anthropic from "@anthropic-ai/sdk";
import { tools, executeTool } from "./tools";

const client = new Anthropic();

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a helpful AI agent. When the user asks something that requires up-to-date data or computation, use the available tools. Otherwise answer directly. Be concise.`;

export async function runAgent(
  initialMessages: Anthropic.MessageParam[],
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let messages: Anthropic.MessageParam[] = [...initialMessages];

      try {
        while (true) {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools,
            messages,
          });

          for (const block of response.content) {
            controller.enqueue(encoder.encode(JSON.stringify(block) + "\n"));
          }

          if (response.stop_reason !== "tool_use") break;

          const toolUses = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          const toolResults: Anthropic.ToolResultBlockParam[] =
            await Promise.all(
              toolUses.map(async (tu) => {
                try {
                  const result = await executeTool(
                    tu.name,
                    tu.input as Record<string, unknown>,
                  );
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: result,
                  };
                } catch (err) {
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: `Error: ${err instanceof Error ? err.message : String(err)}`,
                    is_error: true,
                  };
                }
              }),
            );

          messages = [
            ...messages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "text",
              text: `\n\n[error: ${err instanceof Error ? err.message : String(err)}]`,
            }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}
