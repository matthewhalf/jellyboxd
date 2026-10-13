import * as SecureStore from "expo-secure-store";
import { JellyfinService, savedServerLabel, savedServerSubtitle, type SavedServer } from "../jellyfin";

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null)),
  setItemAsync: jest.fn((k: string, v: string) => Promise.resolve(void mockStore.set(k, v))),
  deleteItemAsync: jest.fn((k: string) => Promise.resolve(void mockStore.delete(k))),
}));

const session = { serverUrl: "http://srv", token: "t", userId: "u", userName: "Ann" };

beforeEach(() => {
  mockStore.clear();
  jest.mocked(SecureStore.setItemAsync).mockClear();
});

describe("saved server names", () => {
  it("renames a saved server and keeps the name when its token is refreshed", async () => {
    await JellyfinService.upsertSavedServer(session);
    await JellyfinService.renameSavedServer("http://srv::u", "  Casa  ");
    const [renewed] = await JellyfinService.upsertSavedServer({ ...session, token: "t2" });
    expect(renewed).toMatchObject({ token: "t2", name: "Casa" });
  });

  it("removes the name when it's set to blank", async () => {
    await JellyfinService.upsertSavedServer(session);
    await JellyfinService.renameSavedServer("http://srv::u", "Casa");
    const [server] = await JellyfinService.renameSavedServer("http://srv::u", "   ");
    expect(server.name).toBeUndefined();
  });

  it("labels servers by name, falling back to the user name", () => {
    const plain: SavedServer = { ...session, id: "http://srv::u" };
    expect(savedServerLabel(plain)).toBe("Ann");
    expect(savedServerSubtitle(plain)).toBe("http://srv");
    expect(savedServerLabel({ ...plain, name: "Casa" })).toBe("Casa");
    expect(savedServerSubtitle({ ...plain, name: "Casa" })).toBe("Ann · http://srv");
  });
});
