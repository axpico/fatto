import { z } from "zod";

// Groq e OpenRouter espongono entrambi un endpoint /chat/completions compatibile OpenAI: stessa
// forma di richiesta (headers, messages, response_format json_schema), condivisa qui. Status
// handling ed estrazione del content restano ai chiamanti perché differiscono (es. 401 speciale
// solo su OpenRouter, dettaglio errore solo su Groq).

export function chatCompletionBody<T>(opts: {
  model: string;
  systemPrompt: string;
  jsonInstructions: string;
  userContent: unknown;
  schema: z.ZodType<T>;
  extra?: Record<string, unknown>;
}) {
  return {
    model: opts.model,
    messages: [
      { role: "system", content: `${opts.systemPrompt}\n\n${opts.jsonInstructions}` },
      { role: "user", content: opts.userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "response", schema: z.toJSONSchema(opts.schema) },
    },
    ...opts.extra,
  };
}

export async function postChatCompletion(url: string, apiKey: string | undefined, body: Record<string, unknown>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40000),
  });
}

export function extractChatContent(body: unknown): string | undefined {
  return (body as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
}

export function parseJsonResponse<T>(content: string, schema: z.ZodType<T>): T {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");

  const parsed = JSON.parse(stripped);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Risposta non conforme allo schema (${result.error.message})`);
  }
  return result.data;
}
