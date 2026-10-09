import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";

class UnsafeUrlError extends Error {}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT, also Tailscale
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast + reserved
  );
}

export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return isPrivateIPv4(lower.slice("::ffff:".length));
  return false;
}

function isPrivate({ address, family }: LookupAddress): boolean {
  return family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

/** Rejects non-http(s), localhost and private IP literals. Hostnames are checked at DNS time. */
export function assertAllowedUrl(parsed: URL): void {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Protocollo non consentito");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost") throw new UnsafeUrlError("Host non consentito");
  // Node skips the `lookup` hook entirely for IP-literal hosts, so pinnedLookup below never sees
  // them: they must be checked here (URL parsing already normalises forms like http://2130706433/)
  const family = isIP(host);
  if (family !== 0 && isPrivate({ address: host, family })) {
    throw new UnsafeUrlError("Host non consentito");
  }
}

// ponytail: blocca solo gli intervalli privati/link-local più comuni (RFC1918, loopback, CGNAT,
// metadata cloud 169.254.169.254) — non un elenco esaustivo di IP "non pubblici"
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

type FetchInit = { signal?: AbortSignal; maxBytes?: number };

function requestOnce(parsed: URL, init: FetchInit): Promise<Response> {
  const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES;
  const transport = parsed.protocol === "https:" ? https : http;
  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(parsed, { lookup: pinnedLookup, signal: init.signal }, (res) => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(", "));
      }
      if (res.statusCode && REDIRECT_STATUSES.has(res.statusCode)) {
        res.resume(); // body of a redirect is irrelevant
        resolve(new Response(null, { status: res.statusCode, headers }));
        return;
      }
      const chunks: Buffer[] = [];
      let received = 0;
      res.on("data", (chunk: Buffer) => {
        received += chunk.length;
        // cap memory: a hostile page (or image URL in its JSON-LD) could stream gigabytes
        if (received > maxBytes) {
          req.destroy(new UnsafeUrlError("Risposta troppo grande"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("error", reject);
      res.on("end", () => {
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, headers }));
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/** fetch() con protezione SSRF: rifiuta URL non http(s)/localhost/IP privati, pinna la
 * risoluzione DNS, limita la dimensione della risposta e segue fino a 3 redirect ricontrollando
 * ogni destinazione. */
export async function fetchPublic(url: string, init: FetchInit = {}): Promise<Response> {
  let parsed = new URL(url);
  for (let hop = 0; ; hop++) {
    assertAllowedUrl(parsed);
    const res = await requestOnce(parsed, init);
    const location = res.headers.get("location");
    if (!REDIRECT_STATUSES.has(res.status) || !location) return res;
    if (hop >= MAX_REDIRECTS) throw new UnsafeUrlError("Troppi redirect");
    parsed = new URL(location, parsed);
  }
}
