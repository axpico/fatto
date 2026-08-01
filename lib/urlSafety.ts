import { lookup } from "node:dns/promises";

export class UnsafeUrlError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice("::ffff:".length));
  return false;
}

// ponytail: blocca solo gli intervalli privati/link-local più comuni (RFC1918, loopback, metadata
// cloud 169.254.169.254) — non un elenco esaustivo di IP "non pubblici", sufficiente contro SSRF banale
export async function assertPublicUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Protocollo non consentito");
  }
  if (parsed.hostname === "localhost") {
    throw new UnsafeUrlError("Host non consentito");
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  for (const { address, family } of addresses) {
    const isPrivate = family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
    if (isPrivate) throw new UnsafeUrlError("Host non consentito");
  }
}
