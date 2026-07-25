import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extractedRecipeSchema, type ExtractedRecipe } from "@/lib/ai/schema";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { env } from "@/lib/env";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function callAnthropic(text: string): Promise<ExtractedRecipe> {
  const message = await client.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(extractedRecipeSchema) },
  });

  if (!message.parsed_output) {
    throw new Error("Anthropic: risposta non conforme allo schema atteso");
  }

  return message.parsed_output;
}
