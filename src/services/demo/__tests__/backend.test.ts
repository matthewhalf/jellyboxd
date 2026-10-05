import { demoBackend } from "../backend";
import { DEMO_MOVIES } from "../fixtures";

beforeEach(() => demoBackend.resetState());

describe("pages", () => {
  it("pages through movies and reports the total", () => {
    const page = demoBackend.moviesPage(0, 4);
    expect(page.ok).toBe(true);
    expect(page.items).toHaveLength(4);
    expect(page.total).toBe(DEMO_MOVIES.length);
    expect(page.items.every((i) => i.Type === "Movie")).toBe(true);
  });

  it("returns an empty ok page past the end instead of failing", () => {
    expect(demoBackend.moviesPage(999, 4)).toEqual({ items: [], total: DEMO_MOVIES.length, ok: true });
    expect(demoBackend.seriesPage(999, 4).items).toEqual([]);
    expect(demoBackend.libraryItemsPage("demo-lib-movies", 999, 4).ok).toBe(true);
  });

  it("filters library pages by parent and answers ok for an unknown parent", () => {
    const movies = demoBackend.libraryItemsPage("demo-lib-movies", 0, 50);
    expect(movies.items.every((i) => i.Type === "Movie")).toBe(true);
    const series = demoBackend.libraryItemsPage("demo-lib-series", 0, 50);
    expect(series.items.every((i) => i.Type === "Series")).toBe(true);
    expect(demoBackend.libraryItemsPage("nope", 0, 50)).toEqual({ items: [], total: 0, ok: true });
  });

  it("lists the latest movies newest first and honours the limit", () => {
    const latest = demoBackend.latestMovies(2);
    expect(latest).toHaveLength(2);
    expect(latest[0].DateCreated! >= latest[1].DateCreated!).toBe(true);
  });
});

describe("search", () => {
  it("is case-insensitive and ignores diacritics", () => {
    expect(demoBackend.search("SINTEL", "Movie,Series").map((i) => i.Name)).toContain("Sintel");
    expect(demoBackend.search("sïntel", "Movie,Series").map((i) => i.Name)).toContain("Sintel");
  });

  it("returns an empty list when nothing matches or the query is blank", () => {
    expect(demoBackend.search("zzzz", "Movie,Series")).toEqual([]);
    expect(demoBackend.search("   ", "Movie,Series")).toEqual([]);
  });

  it("respects the requested item types", () => {
    const hits = demoBackend.search("a", "Series");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((i) => i.Type === "Series")).toBe(true);
  });
});

describe("seasons and episodes", () => {
  it("lists a series' seasons and a season's episodes in order", () => {
    const seasons = demoBackend.seasons("demo-series-caminandes");
    expect(seasons).toHaveLength(1);
    const eps = demoBackend.episodes("demo-series-caminandes", seasons[0].Id);
    expect(eps.map((e) => e.IndexNumber)).toEqual([1, 2, 3]);
  });

  it("returns empty lists for unknown ids", () => {
    expect(demoBackend.seasons("nope")).toEqual([]);
    expect(demoBackend.episodes("nope", "nope")).toEqual([]);
  });
});

describe("user state", () => {
  it("starts with something to continue watching", () => {
    expect(demoBackend.continueWatching().length).toBeGreaterThan(0);
    expect(demoBackend.resumeItems().length).toBeGreaterThan(0);
  });

  it("reflects favorites in item details", () => {
    expect(demoBackend.setFavorite("demo-movie-sintel", true)).toBe(true);
    expect(demoBackend.itemDetails("demo-movie-sintel")?.UserData?.IsFavorite).toBe(true);
    expect(demoBackend.setFavorite("demo-movie-sintel", false)).toBe(true);
    expect(demoBackend.itemDetails("demo-movie-sintel")?.UserData?.IsFavorite).toBe(false);
  });

  it("returns false when favoriting or marking an unknown item", () => {
    expect(demoBackend.setFavorite("nope", true)).toBe(false);
    expect(demoBackend.setPlayed("nope", true)).toBe(false);
    expect(demoBackend.itemDetails("nope")).toBeNull();
  });

  it("marks items played and unplayed", () => {
    demoBackend.setPlayed("demo-movie-spring", true);
    expect(demoBackend.itemDetails("demo-movie-spring")?.UserData?.Played).toBe(true);
    demoBackend.setPlayed("demo-movie-spring", false);
    expect(demoBackend.itemDetails("demo-movie-spring")?.UserData?.Played).toBe(false);
  });

  it("adds an item to continue watching once progress is reported", () => {
    expect(demoBackend.continueWatching().map((i) => i.Id)).not.toContain("demo-movie-sintel");
    demoBackend.reportProgress("demo-movie-sintel", 5 * 600_000_000);
    expect(demoBackend.continueWatching().map((i) => i.Id)).toContain("demo-movie-sintel");
    expect(demoBackend.itemDetails("demo-movie-sintel")?.UserData?.PlayedPercentage).toBeGreaterThan(0);
  });

  it("offers the next unplayed episode after one is played", () => {
    expect(demoBackend.nextUpForSeries("demo-series-caminandes")?.Id).toBe("demo-ep-cam2");
    demoBackend.setPlayed("demo-ep-cam2", true);
    expect(demoBackend.nextUpForSeries("demo-series-caminandes")?.Id).toBe("demo-ep-cam3");
    demoBackend.setPlayed("demo-ep-cam3", true);
    expect(demoBackend.nextUpForSeries("demo-series-caminandes")).toBeNull();
    expect(demoBackend.nextUpForSeries("nope")).toBeNull();
  });

  it("resetState restores the initial state", () => {
    demoBackend.setFavorite("demo-movie-bbb", true);
    demoBackend.setPlayed("demo-movie-spring", true);
    demoBackend.resetState();
    expect(demoBackend.itemDetails("demo-movie-bbb")?.UserData?.IsFavorite).toBe(false);
    expect(demoBackend.itemDetails("demo-movie-spring")?.UserData?.Played).toBe(false);
  });

  it("does not mutate the exported fixtures", () => {
    demoBackend.setFavorite("demo-movie-sintel", true);
    expect(DEMO_MOVIES.find((m) => m.Id === "demo-movie-sintel")?.UserData?.IsFavorite).toBe(false);
  });
});

describe("home shelves", () => {
  it("returns featured items with backdrops, newest first, up to the limit", () => {
    const featured = demoBackend.featured(4);
    expect(featured).toHaveLength(4);
    expect(featured.every((i) => (i.BackdropImageTags?.length ?? 0) > 0)).toBe(true);
  });

  it("lists libraries", () => {
    expect(demoBackend.libraries().map((l) => l.Id)).toEqual(["demo-lib-movies", "demo-lib-series"]);
  });
});
