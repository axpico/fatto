import { z } from "zod";

// ponytail: docker-compose interpola ${VAR} non impostata in .env come stringa vuota, non come
// variabile assente — senza questo preprocess, min(1).optional() rifiuta "" e crasha l'avvio
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: optionalString(),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5"),
  OPENROUTER_API_KEY: optionalString(),
  OPENROUTER_MODEL_OVERRIDE: optionalString(),
  GROQ_API_KEY: optionalString(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  ADMIN_EMAIL: optionalString(),
  ADMIN_PASSWORD: optionalString(),
  ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().default("Admin")),
  TESSDATA_PREFIX: optionalString(),
  COOKIE_SECURE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
});

export const env = envSchema.parse(process.env);
