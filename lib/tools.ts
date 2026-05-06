import type Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "get_current_time",
    description:
      "Returns the current server time in ISO 8601 format. Use this when the user asks for the current date or time.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "echo",
    description:
      "Echoes the input text back. Useful as a placeholder or for testing the tool-use loop.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to echo back.",
        },
      },
      required: ["text"],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "get_current_time":
      return new Date().toISOString();

    case "echo": {
      const text = input.text;
      if (typeof text !== "string") {
        throw new Error("echo: 'text' must be a string");
      }
      return text;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
