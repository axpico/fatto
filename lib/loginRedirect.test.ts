import { describe, expect, it } from "vitest";
import { loginHref, safeNextPath } from "./loginRedirect";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query", () => {
    expect(safeNextPath("/recipes/abc?x=1")).toBe("/recipes/abc?x=1");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil", "", null, undefined, "/login", "/login?next=/x"])(
    "falls back to / for %s",
    (raw) => {
      expect(safeNextPath(raw)).toBe("/");
    },
  );
});

describe("loginHref", () => {
  it("encodes the next path", () => {
    expect(loginHref("/recipes/a?b=1")).toBe("/login?next=%2Frecipes%2Fa%3Fb%3D1");
  });

  it("omits next for the home page", () => {
    expect(loginHref("/")).toBe("/login");
  });
});
