import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";

class UnsafeUrlError extends Error {}

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

function isPrivate({ address, family }: LookupAddress): boolean {
  return family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

// ponytail: blocca solo gli intervalli privati/link-local più comuni (RFC1918, loopback, metadata
// cloud 169.254.169.254) — non un elenco esaustivo di IP "non pubblici", sufficiente contro SSRF banale
//
// Risolve l'hostname una sola volta e quell'indirizzo è quello a cui Node si connette davvero
// (via l'opzione `lookup` di http/https.request): niente seconda risoluzione DNS separata tra il
// controllo e la richiesta vera, quindi niente gap di DNS-rebinding.
const pinnedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    if (addresses.length === 0 || addresses.some(isPrivate)) {
      return callback(new UnsafeUrlError("Host non consentito"), "", 4);
    }
    // Node con Happy Eyeballs (autoSelectFamily, default da v20) chiama lookup con
    // options.all e si aspetta indietro l'intero array, non la forma singola (address, family):
    // passare quest'ultima gli fa leggere l'array come stringa e crasha con "Invalid IP address: undefined".
    if (options.all) {
      callback(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

/** fetch() con protezione SSRF: rifiuta URL non http(s)/localhost e pinna la risoluzione DNS. */
export async function fetchPublic(url: string, init: { signal?: AbortSignal } = {}): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Protocollo non consentito");
  }
  if (parsed.hostname === "localhost") {
    throw new UnsafeUrlError("Host non consentito");
  }

  const transport = parsed.protocol === "https:" ? https : http;
  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(parsed, { lookup: pinnedLookup, signal: init.signal }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") headers.set(key, value);
          else if (Array.isArray(value)) headers.set(key, value.join(", "));
        }
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, headers }));
      });
    });
    req.on("error", reject);
    req.end();
  });
}
