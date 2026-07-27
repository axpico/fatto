import { z } from "zod";
import { parseJsonResponse } from "@/lib/ai/openrouterProvider";
import { env } from "@/lib/env";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq<T>(
  text: string,
  systemPrompt: string,
  jsonInstructions: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${jsonInstructions}` },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema: z.toJSONSchema(schema) },
      },
      // ponytail: gpt-oss è un modello "reasoning" — senza questo su un testo lungo spende il
      // budget di completion in catena di pensiero e restituisce HTTP 400 "max completion tokens
      // reached before generating a valid document" prima di arrivare al JSON vero e proprio
      reasoning_effort: "low",
    }),
    signal: AbortSignal.timeout(40000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq ${env.GROQ_MODEL}: HTTP ${res.status} ${detail}`.trim());
  }

  const body = await res.json();
  const content: string | undefined = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Groq ${env.GROQ_MODEL}: risposta vuota`);
  }

  return parseJsonResponse(content, schema);
}
