import path from "node:path";
import { createHash } from "node:crypto";
import type { NextConfig } from "next";
import { THEME_INIT_SCRIPT } from "./lib/theme";

// Everything (images, fonts, api) is same-origin: uploads are served via /api/uploads, next/font
// self-hosts at build time, and tesseract.js/pdf-parse only run server-side. That leaves one inline
// script (the theme-init flash guard) needing a hash instead of 'unsafe-inline'. style-src keeps
// 'unsafe-inline' because framer-motion drives animations through inline style attributes.
const themeScriptHash = createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${themeScriptHash}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "pdf-parse"],
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
