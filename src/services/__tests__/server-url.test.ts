import { normalizeServerUrl } from "../server-url";

describe("normalizeServerUrl", () => {
  it("adds http:// and strips whitespace and the trailing slash", () => {
    expect(normalizeServerUrl(" 192.168.1.10:8096/ ")).toBe("http://192.168.1.10:8096");
  });

  it("keeps https and strips the trailing slash", () => {
    expect(normalizeServerUrl("https://a.b/")).toBe("https://a.b");
  });

  it("leaves an already normalized http url untouched", () => {
    expect(normalizeServerUrl("http://x")).toBe("http://x");
  });
});
