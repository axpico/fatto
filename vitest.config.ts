import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    // placeholder: lib/env.ts valida DATABASE_URL a livello di modulo, non serve un valore reale
    // per testare funzioni pure che semplicemente importano lo stesso file di un provider AI
    env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test" },
  },
});
