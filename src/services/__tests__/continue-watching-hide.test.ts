import * as SecureStore from "expo-secure-store";
import { JellyfinService } from "../jellyfin";

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

const session = { serverUrl: "http://srv", userId: "u1", token: "tok", userName: "me" };

const episode = (id: string, seriesId: string, lastPlayed?: string) => ({
  Id: id,
  Name: id,
  Type: "Episode",
  SeriesId: seriesId,
  UserData: { PlaybackPositionTicks: 0, Played: false, LastPlayedDate: lastPlayed },
});

/** Answers the three requests continue watching makes: resume, next up, played history. */
function mockServer(nextUp: object[], lastPlayed: { SeriesId: string; date: string }[] = []) {
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const items = url.includes("/Shows/NextUp")
      ? nextUp
      : url.includes("Filters=IsPlayed")
        ? lastPlayed.map((p, i) => ({ Id: `played-${i}`, SeriesId: p.SeriesId, UserData: { LastPlayedDate: p.date } }))
        : [];
    return { ok: true, json: async () => ({ Items: items }) } as Response;
  });
}

describe("removing from continue watching", () => {
  beforeEach(() => mockStore.clear());
  afterEach(() => jest.restoreAllMocks());

  it("hides the whole series, so its next episode doesn't take the card's place", async () => {
    mockServer([episode("e2", "s1"), episode("x1", "s2")]);
    await JellyfinService.hideFromContinueWatching(session, episode("e1", "s1") as any);
    const ids = (await JellyfinService.fetchContinueWatching(session)).map((i) => i.Id);
    expect(ids).toEqual(["x1"]);
  });

  it("brings the series back once it is played after the removal", async () => {
    await JellyfinService.hideFromContinueWatching(session, episode("e1", "s1") as any);
    const later = new Date(Date.now() + 60_000).toISOString();
    mockServer([episode("e2", "s1")], [{ SeriesId: "s1", date: later }]);
    const ids = (await JellyfinService.fetchContinueWatching(session)).map((i) => i.Id);
    expect(ids).toEqual(["e2"]);
  });

  it("keeps the removals per user", async () => {
    mockServer([episode("e2", "s1")]);
    await JellyfinService.hideFromContinueWatching(session, episode("e1", "s1") as any);
    const other = { ...session, userId: "u2" };
    expect((await JellyfinService.fetchContinueWatching(other)).map((i) => i.Id)).toEqual(["e2"]);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("jellyboxd_cw_hidden_u1", expect.any(String));
  });
});
