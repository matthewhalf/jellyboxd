import { JellyfinService } from "../jellyfin";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const session = { serverUrl: "http://srv", userId: "u", token: "tok" } as any;

describe("series quality badges", () => {
  afterEach(() => jest.restoreAllMocks());

  it("asks for the next episode's media sources, which the series page reads its badges from", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({ Items: [] }) } as Response);
    await JellyfinService.fetchNextUpForSeries(session, "s1");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/Shows/NextUp");
    expect(new URL(url).searchParams.get("Fields")?.split(",")).toContain("MediaSources");
  });
});
