import { describe, expect, it } from "vitest";
import { detectVideoPlatform, extractFirstUrl } from "./videoPlatforms";

describe("detectVideoPlatform", () => {
  it.each([
    ["https://www.instagram.com/reel/abc123/", "instagram"],
    ["https://youtu.be/xyz", "youtube"],
    ["https://m.youtube.com/watch?v=xyz", "youtube"],
    ["https://www.youtube.com/shorts/xyz", "youtube"],
    ["https://vm.tiktok.com/ZM123/", "tiktok"],
    ["  https://www.instagram.com/p/abc/  ", "instagram"],
  ])("%s → %s", (url, platform) => {
    expect(detectVideoPlatform(url)).toBe(platform);
  });

  it("returns null for regular recipe pages", () => {
    expect(detectVideoPlatform("https://www.giallozafferano.it/ricetta/x")).toBeNull();
    expect(detectVideoPlatform("https://www.instagram.com/someuser/")).toBeNull();
  });
});

describe("extractFirstUrl", () => {
  it("pulls the link out of shared text", () => {
    expect(extractFirstUrl("Guarda questa https://example.com/r?a=1 buona!")).toBe("https://example.com/r?a=1");
  });

  it("returns null without a link", () => {
    expect(extractFirstUrl("solo testo")).toBeNull();
  });
});
