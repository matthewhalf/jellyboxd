import { findItalian } from "../testing/findItalian";

// Minimal local typings: the project tsconfig deliberately has no Node types, so no `import`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs") as {
  readdirSync(dir: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
  readFileSync(file: string, encoding: "utf8"): string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path") as {
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
  resolve(...parts: string[]): string;
  sep: string;
};

const SRC = path.resolve(process.cwd(), "src");

/** Files that still contain hand-written Italian. Each migration task removes its files from here. */
const ITALIAN_PENDING: string[] = [
  "app/item/[id].tsx",
  "app/(tabs)/search/index.tsx",
  "components/MediaLink.tsx",
  "context/NativePlayerContext.tsx",
  "services/jellyfin.ts",
].map((f) => f.split("/").join(path.sep));

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "testing" ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(SRC)
  .map((f) => path.relative(SRC, f))
  .filter((f) => f !== path.join("i18n", "it.ts") && !f.startsWith(path.join("services", "demo")));

describe("hard-coded Italian", () => {
  it("is gone from every file that is not listed as pending", () => {
    const offenders = files
      .filter((f) => !ITALIAN_PENDING.includes(f))
      .map((f) => ({ file: f, lines: findItalian(fs.readFileSync(path.join(SRC, f), "utf8")) }))
      .filter((r) => r.lines.length > 0);
    expect(offenders).toEqual([]);
  });

  it("is still present in every pending file, so the list stays honest", () => {
    const stale = ITALIAN_PENDING.filter(
      (f) => findItalian(fs.readFileSync(path.join(SRC, f), "utf8")).length === 0
    );
    expect(stale).toEqual([]);
  });
});
