// The project tsconfig has no Node types, so `require` is typed locally
const load = require as (path: string) => any; // eslint-disable-line @typescript-eslint/no-require-imports

const appJson = load("../../../app.json").expo;
const resolveFromRoot = (relative: string) => load(`../../../${relative.replace(/^\.\//, "")}`);

describe("native iOS strings", () => {
  it("declares English and Italian locale files", () => {
    expect(Object.keys(appJson.locales ?? {}).sort()).toEqual(["en", "it"]);
  });

  it("localizes the local network permission in both languages, differently", () => {
    const en = resolveFromRoot(appJson.locales.en).ios.NSLocalNetworkUsageDescription;
    const it = resolveFromRoot(appJson.locales.it).ios.NSLocalNetworkUsageDescription;
    expect(typeof en).toBe("string");
    expect(typeof it).toBe("string");
    expect(en).not.toBe(it);
    expect(it).toMatch(/rete locale/);
  });

  it("uses the English text as the base Info.plist value", () => {
    const en = resolveFromRoot(appJson.locales.en).ios.NSLocalNetworkUsageDescription;
    expect(appJson.ios.infoPlist.NSLocalNetworkUsageDescription).toBe(en);
  });

  it("allows mixed localizations", () => {
    expect(appJson.ios.infoPlist.CFBundleAllowMixedLocalizations).toBe(true);
  });
});
