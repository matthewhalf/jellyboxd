import { setCurrentLanguage, t } from "../../../i18n";
import { findItalian } from "../../../i18n/testing/findItalian";
import { demoBackend } from "../backend";
import { DEMO_EPISODES, DEMO_LIBRARIES, DEMO_MOVIES, DEMO_SEASONS, DEMO_SERIES } from "../fixtures";

afterEach(() => setCurrentLanguage("en"));

const visibleText = () => {
  const items = [
    ...demoBackend.libraries(),
    ...DEMO_MOVIES.map((m) => demoBackend.itemDetails(m.Id)!),
    ...DEMO_SERIES.map((s) => demoBackend.itemDetails(s.Id)!),
    ...DEMO_SEASONS.map((s) => demoBackend.itemDetails(s.Id)!),
    ...DEMO_EPISODES.map((e) => demoBackend.itemDetails(e.Id)!),
  ];
  return items.flatMap((i) => [i.Name, i.Overview, i.SeasonName, ...(i.Genres ?? [])]).filter((x): x is string => !!x);
};

describe("demo content in English", () => {
  beforeEach(() => setCurrentLanguage("en"));

  it("localizes libraries, seasons, genres and overviews", () => {
    expect(demoBackend.libraries().map((l) => l.Name)).toEqual(["Movies", "TV Shows"]);
    const bbb = demoBackend.itemDetails("demo-movie-bbb")!;
    expect(bbb.Overview).toMatch(/^A gentle giant rabbit/);
    expect(bbb.Genres).toEqual(["Animation", "Comedy"]);
    expect(demoBackend.seasons("demo-series-caminandes")[0].Name).toBe("Season 1");
    expect(demoBackend.itemDetails("demo-ep-cam1")?.SeasonName).toBe("Season 1");
  });

  it("has no Italian in any visible text", () => {
    for (const text of visibleText()) {
      expect({ text, italian: findItalian(text) }).toEqual({ text, italian: [] });
    }
  });

  it("has an English attribution", () => {
    expect(t("demo.attribution")).toContain("not affiliated");
  });
});

describe("demo content in Italian", () => {
  beforeEach(() => setCurrentLanguage("it"));

  it("localizes libraries, seasons, genres and overviews", () => {
    expect(demoBackend.libraries().map((l) => l.Name)).toEqual(["Film", "Serie TV"]);
    const bbb = demoBackend.itemDetails("demo-movie-bbb")!;
    expect(bbb.Overview).toMatch(/^Un enorme coniglio/);
    expect(bbb.Genres).toEqual(["Animazione", "Commedia"]);
    expect(demoBackend.seasons("demo-series-caminandes")[0].Name).toBe("Stagione 1");
    expect(demoBackend.itemDetails("demo-ep-cam1")?.SeasonName).toBe("Stagione 1");
  });

  it("has an Italian attribution", () => {
    expect(t("demo.attribution")).toContain("non è affiliato");
  });
});

describe("demo content in either language", () => {
  it("keeps film and episode titles as the original names", () => {
    setCurrentLanguage("en");
    const english = [...DEMO_MOVIES, ...DEMO_EPISODES].map((i) => demoBackend.itemDetails(i.Id)!.Name);
    setCurrentLanguage("it");
    const italian = [...DEMO_MOVIES, ...DEMO_EPISODES].map((i) => demoBackend.itemDetails(i.Id)!.Name);
    expect(italian).toEqual(english);
  });

  it("follows a language change on the next read", () => {
    setCurrentLanguage("en");
    expect(demoBackend.libraries()[0].Name).toBe("Movies");
    setCurrentLanguage("it");
    expect(demoBackend.libraries()[0].Name).toBe("Film");
  });

  it("credits every film and episode, and names the license, in both languages", () => {
    for (const language of ["en", "it"] as const) {
      setCurrentLanguage(language);
      const attribution = t("demo.attribution");
      for (const item of [...DEMO_MOVIES, ...DEMO_EPISODES]) expect(attribution).toContain(item.Name);
      expect(attribution).toContain("CC BY");
    }
  });

  it("keeps only dictionary keys, never display text, in the raw fixtures", () => {
    for (const item of [...DEMO_LIBRARIES, ...DEMO_SEASONS]) expect(item.Name).toMatch(/^demo\./);
    for (const item of [...DEMO_MOVIES, ...DEMO_SERIES, ...DEMO_EPISODES]) {
      expect(item.Overview).toMatch(/^demo\.overview\./);
    }
    for (const item of [...DEMO_MOVIES, ...DEMO_SERIES]) {
      for (const genre of item.Genres ?? []) expect(genre).toMatch(/^demo\.genres\./);
    }
  });
});
