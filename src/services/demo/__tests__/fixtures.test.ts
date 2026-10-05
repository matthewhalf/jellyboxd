import { Image } from "react-native";
import {
  DEMO_EPISODES,
  DEMO_LIBRARIES,
  DEMO_MOVIES,
  DEMO_SEASONS,
  DEMO_SERIES,
  DEMO_STREAMS,
} from "../fixtures";
import { demoImageUrl } from "../images";

const ALL_ITEMS = [
  ...DEMO_LIBRARIES,
  ...DEMO_MOVIES,
  ...DEMO_SERIES,
  ...DEMO_SEASONS,
  ...DEMO_EPISODES,
];

describe("demo fixtures", () => {
  it("has unique item ids", () => {
    const ids = ALL_ITEMS.map((i) => i.Id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least 6 movies and 2 series with 3 episodes each", () => {
    expect(DEMO_MOVIES.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_SERIES.length).toBeGreaterThanOrEqual(2);
    for (const series of DEMO_SERIES) {
      const episodes = DEMO_EPISODES.filter((e) => e.SeriesId === series.Id);
      expect(episodes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every movie and episode an https stream", () => {
    for (const item of [...DEMO_MOVIES, ...DEMO_EPISODES]) {
      expect(DEMO_STREAMS[item.Id]).toMatch(/^https:\/\//);
    }
  });

  it("links every episode to an existing series and season", () => {
    const seriesIds = new Set(DEMO_SERIES.map((s) => s.Id));
    const seasonIds = new Set(DEMO_SEASONS.map((s) => s.Id));
    for (const ep of DEMO_EPISODES) {
      expect(seriesIds.has(ep.SeriesId!)).toBe(true);
      expect(seasonIds.has(ep.SeasonId!)).toBe(true);
    }
  });

  it("tags every movie and series with a poster and a backdrop", () => {
    for (const item of [...DEMO_MOVIES, ...DEMO_SERIES]) {
      expect(item.ImageTags?.Primary).toBeTruthy();
      expect(item.BackdropImageTags?.length).toBeGreaterThan(0);
    }
  });

  it("gives every item a distinct DateCreated so 'latest' ordering is stable", () => {
    const dates = [...DEMO_MOVIES, ...DEMO_SERIES].map((i) => i.DateCreated);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe("demoImageUrl", () => {
  afterEach(() => jest.restoreAllMocks());

  it("returns the resolved bundled asset uri, never a demo:// url, for any item or image type", () => {
    jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///bundle/art.jpg", width: 1, height: 1, scale: 1 });
    for (const item of ALL_ITEMS) {
      for (const type of ["Primary", "Backdrop", "Thumb", "Logo"] as const) {
        expect(demoImageUrl(item.Id, type)).toBe("file:///bundle/art.jpg");
      }
    }
  });

  it("falls back to an https image when the bundled asset cannot be resolved", () => {
    jest.spyOn(Image, "resolveAssetSource").mockReturnValue(undefined as never);
    expect(demoImageUrl("demo-movie-bbb", "Primary")).toMatch(/^https:\/\//);
    expect(demoImageUrl("does-not-exist", "Primary")).toMatch(/^https:\/\//);
  });

  it("uses a valid image for an unknown id", () => {
    jest.spyOn(Image, "resolveAssetSource").mockReturnValue({ uri: "file:///bundle/art.jpg", width: 1, height: 1, scale: 1 });
    expect(demoImageUrl("does-not-exist", "Primary")).toBe("file:///bundle/art.jpg");
  });
});
