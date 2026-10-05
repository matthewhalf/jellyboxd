import * as SecureStore from "expo-secure-store";
import { demoBackend } from "../demo/backend";
import { DEMO_STREAMS } from "../demo/fixtures";
import { JellyfinService, JellyfinSession } from "../jellyfin";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const fetchMock = jest.fn();
let session: JellyfinSession;

afterEach(() => jest.restoreAllMocks());

beforeEach(async () => {
  jest.clearAllMocks();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockRejectedValue(new Error("network must not be used"));
  demoBackend.resetState();
  session = await JellyfinService.login("demo.jellyboxd", "reviewer", "1test2");
});

describe("demo login", () => {
  it("returns a demo session without touching the network or SecureStore", () => {
    expect(session.serverUrl).toBe("demo://local");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("is not remembered: no stored session and no saved servers", async () => {
    expect(await JellyfinService.getStoredSession()).toBeNull();
    expect(await JellyfinService.getSavedServers()).toEqual([]);
  });

  it("does not hijack a real server that uses the same username and password", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(JellyfinService.login("192.168.1.10:8096", "reviewer", "1test2")).rejects.toThrow(
      /Impossibile raggiungere/
    );
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("demo session data", () => {
  it("answers every read from the demo backend, never from the network", async () => {
    const s = session;
    expect((await JellyfinService.fetchFeatured(s, 4)).length).toBe(4);
    expect((await JellyfinService.fetchContinueWatching(s)).length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchResumeItems(s)).length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchLastPlayedDates(s)).size).toBeGreaterThan(0);
    expect((await JellyfinService.fetchLibraries(s)).length).toBe(2);
    expect((await JellyfinService.fetchLibraryItemsPage(s, "demo-lib-movies", 0, 10)).ok).toBe(true);
    expect((await JellyfinService.fetchMoviesPage(s, 0, 10)).items.length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchSeriesPage(s, 0, 10)).items.length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchLatestMovies(s, 5)).length).toBe(5);
    expect((await JellyfinService.fetchLatestSeries(s, 5)).length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchNextUp(s)).length).toBeGreaterThan(0);
    expect((await JellyfinService.fetchNextUpForSeries(s, "demo-series-caminandes"))?.Id).toBe("demo-ep-cam2");
    expect((await JellyfinService.searchItems(s, "sintel")).map((i) => i.Name)).toContain("Sintel");
    const seasons = await JellyfinService.fetchSeasons(s, "demo-series-caminandes");
    expect((await JellyfinService.fetchEpisodes(s, "demo-series-caminandes", seasons[0].Id)).length).toBe(3);
    expect((await JellyfinService.fetchItemDetails(s, "demo-movie-bbb"))?.Name).toBe("Big Buck Bunny");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("reports the demo server as connected, with a demo name, and not refreshable", async () => {
    expect(await JellyfinService.checkSession(session)).toBe("ok");
    expect((await JellyfinService.fetchServerInfo(session))?.ServerName).toBe("Jellyboxd Demo");
    expect(await JellyfinService.refreshLibrary(session)).toBe("forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps favorites and played state in memory and ignores playback reports", async () => {
    expect(await JellyfinService.setFavorite(session, "demo-movie-sintel", true)).toBe(true);
    expect((await JellyfinService.fetchItemDetails(session, "demo-movie-sintel"))?.UserData?.IsFavorite).toBe(true);
    expect(await JellyfinService.markItemPlayed(session, "demo-movie-spring", true)).toBe(true);
    await JellyfinService.reportPlaybackStart(session, "demo-movie-spring");
    await JellyfinService.reportPlaybackProgress(session, "demo-movie-ed", 600_000_000, false);
    await JellyfinService.reportPlaybackStopped(session, "demo-movie-ed", 600_000_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets playback progress feed 'continue watching' in memory", async () => {
    await JellyfinService.reportPlaybackStopped(session, "demo-movie-ed", 3 * 600_000_000);
    const ids = (await JellyfinService.fetchContinueWatching(session)).map((i) => i.Id);
    expect(ids).toContain("demo-movie-ed");
  });

  it("returns empty results past the end of a page and for no-match searches", async () => {
    expect(await JellyfinService.fetchMoviesPage(session, 999, 10)).toMatchObject({ items: [], ok: true });
    expect(await JellyfinService.searchItems(session, "zzzz")).toEqual([]);
  });
});

describe("demo urls", () => {
  it("never hands a demo:// url to the image or video components", () => {
    for (const type of ["Primary", "Backdrop", "Thumb", "Logo"] as const) {
      const url = JellyfinService.getImageUrl("demo://local", "demo-movie-bbb", type, 600);
      expect(url.length).toBeGreaterThan(0);
      expect(url.startsWith("demo://")).toBe(false);
    }
    expect(JellyfinService.getUserImageUrl(session).startsWith("demo://")).toBe(false);
    expect(JellyfinService.getStreamUrl("demo://local", "demo-movie-bbb", "demo-token")).toBe(
      DEMO_STREAMS["demo-movie-bbb"]
    );
    expect(JellyfinService.getStreamUrl("demo://local", "unknown", "demo-token")).toMatch(/^https:\/\//);
  });

  it("still builds real urls for real servers", () => {
    expect(JellyfinService.getImageUrl("http://srv", "abc", "Primary", 300)).toBe(
      "http://srv/Items/abc/Images/Primary?maxWidth=300&quality=85"
    );
    expect(JellyfinService.getStreamUrl("http://srv", "abc", "tok")).toContain("http://srv/Videos/abc/master.m3u8");
  });
});
