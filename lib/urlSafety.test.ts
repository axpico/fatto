import { describe, expect, it } from "vitest";
import { assertAllowedUrl, isPrivateIPv4 } from "./urlSafety";

describe("assertAllowedUrl", () => {
  it.each([
    "http://127.0.0.1:3000/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.1.1/",
    "http://10.0.0.5/",
    "http://100.100.1.1/", // CGNAT / Tailscale
    "http://2130706433/", // decimal 127.0.0.1
    "http://localhost/",
    "file:///etc/passwd",
  ])("rejects %s", (url) => {
    expect(() => assertAllowedUrl(new URL(url))).toThrow();
  });

  it.each(["https://example.com/ricetta", "http://93.184.216.34/", "https://[2606:4700::1111]/"])("allows %s", (url) => {
    expect(() => assertAllowedUrl(new URL(url))).not.toThrow();
  });
});

describe("isPrivateIPv4", () => {
  it("covers range edges", () => {
    expect(isPrivateIPv4("100.63.255.255")).toBe(false);
    expect(isPrivateIPv4("100.64.0.0")).toBe(true);
    expect(isPrivateIPv4("172.15.0.1")).toBe(false);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("224.0.0.1")).toBe(true);
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
  });
});
