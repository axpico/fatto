import { describe, expect, it } from "vitest";
import { formatDate, formatRelativeDate } from "./formatDate";

describe("formatDate", () => {
  it("uses Italian time, not the server's UTC", () => {
    // 23:30 UTC on 9 Oct = 01:30 on 10 Oct in Rome (CEST)
    expect(formatDate("2026-10-09T23:30:00Z")).toBe("10 ott 2026");
  });
});

describe("formatRelativeDate", () => {
  const now = Date.parse("2026-10-09T12:00:00Z");
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

  it("truncates instead of rounding up", () => {
    expect(formatRelativeDate(ago(45 * 86400), now)).toBe("mese scorso");
    expect(formatRelativeDate(ago(23.6 * 3600), now)).toBe("23 ore fa");
  });

  it("says seconds for very recent dates", () => {
    expect(formatRelativeDate(ago(30), now)).toBe("30 secondi fa");
  });
});
