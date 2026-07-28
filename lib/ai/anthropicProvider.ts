import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { env } from "@/lib/env";
import type { VisionImage } from "@/lib/ai/visionImage";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function callAnthropic<T>(
  text: string,
  systemPrompt: string,
  schema: z.ZodType<T>,
  images?: VisionImage[],
): Promise<T> {
  const content = images?.length
    ? [
        ...images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.mediaType, data: img.data.toString("base64") },
        })),
        { type: "text" as const, text },
      ]
    : text;

  const message = await client.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!message.parsed_output) {
    throw new Error("Anthropic: risposta non conforme allo schema atteso");
  }

  return message.parsed_output;
}
