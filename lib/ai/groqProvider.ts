import { z } from "zod";
import { chatCompletionBody, postChatCompletion, extractChatContent, parseJsonResponse } from "@/lib/ai/openaiCompatChat";
import { env } from "@/lib/env";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq<T>(
  text: string,
  systemPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const res = await postChatCompletion(
    CHAT_URL,
    env.GROQ_API_KEY,
    chatCompletionBody({
      model: env.GROQ_MODEL,
      systemPrompt,
      userContent: text,
      schema,
      // ponytail: gpt-oss è un modello "reasoning" — senza questo su un testo lungo spende il
      // budget di completion in catena di pensiero e restituisce HTTP 400 "max completion tokens
      // reached before generating a valid document" prima di arrivare al JSON vero e proprio
      extra: { reasoning_effort: "low" },
    }),
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq ${env.GROQ_MODEL}: HTTP ${res.status} ${detail}`.trim());
  }

  const content = extractChatContent(await res.json());
  if (!content) {
    throw new Error(`Groq ${env.GROQ_MODEL}: risposta vuota`);
  }

  return parseJsonResponse(content, schema);
}
