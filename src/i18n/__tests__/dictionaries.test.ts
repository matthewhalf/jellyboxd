import { en } from "../en";
import { it as italian } from "../it";
import { findItalian } from "../testing/findItalian";

function flatten(node: unknown, prefix = ""): Record<string, string> {
  if (typeof node === "string") return { [prefix]: node };
  return Object.entries(node as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => ({ ...acc, ...flatten(value, prefix ? `${prefix}.${key}` : key) }),
    {}
  );
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const flatEn = flatten(en);
const flatIt = flatten(italian);

describe("dictionaries", () => {
  it("have exactly the same keys in English and Italian", () => {
    expect(Object.keys(flatIt).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("use the same placeholders in both languages for every key", () => {
    for (const key of Object.keys(flatEn)) {
      expect({ key, placeholders: placeholders(flatIt[key]) }).toEqual({
        key,
        placeholders: placeholders(flatEn[key]),
      });
    }
  });

  it("have no empty strings", () => {
    for (const [key, value] of [...Object.entries(flatEn), ...Object.entries(flatIt)]) {
      expect({ key, empty: value.trim() === "" }).toEqual({ key, empty: false });
    }
  });

  it("have no Italian in the English dictionary", () => {
    for (const [key, value] of Object.entries(flatEn)) {
      expect({ key, italian: findItalian(value) }).toEqual({ key, italian: [] });
    }
  });
});
