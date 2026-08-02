import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nonce CSP per-request: un hash statico (la versione precedente) copre solo script con contenuto
// fisso, ma Next (App Router) inietta script inline per-request per l'hydration (payload RSC), il
// cui contenuto cambia ad ogni pagina — nessun hash fisso può coprirli. Un nonce + 'strict-dynamic'
// sì: Next applica automaticamente lo stesso nonce ai propri script inline, e strict-dynamic estende
// la fiducia agli script caricati da uno script già autorizzato (i chunk via <script src>), coprendo
// tutta la pipeline di hydration senza 'unsafe-inline'.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // /login resta raggiungibile senza sessione (altrimenti loop di redirect); ora è nel matcher
  // (a differenza di prima) solo perché deve comunque ricevere l'header CSP.
  if (request.nextUrl.pathname !== "/login" && !request.cookies.has("session")) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
};
