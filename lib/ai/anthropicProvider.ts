import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function callAnthropic<T>(text: string, systemPrompt: string, schema: z.ZodType<T>): Promise<T> {
  const message = await client.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!message.parsed_output) {
    throw new Error("Anthropic: risposta non conforme allo schema atteso");
  }

  return message.parsed_output;
}
