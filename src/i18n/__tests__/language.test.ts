import * as SecureStore from "expo-secure-store";
import { loadLanguagePreference, resolveLanguage, saveLanguagePreference } from "../language";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("resolveLanguage", () => {
  it("follows the phone for 'system': only Italian gives Italian", () => {
    expect(resolveLanguage("system", ["it"])).toBe("it");
    expect(resolveLanguage("system", ["IT"])).toBe("it");
    expect(resolveLanguage("system", ["it-IT"])).toBe("it");
    expect(resolveLanguage("system", ["de"])).toBe("en");
    expect(resolveLanguage("system", ["fr", "it"])).toBe("en");
  });

  it("falls back to English with no usable device language", () => {
    expect(resolveLanguage("system", [])).toBe("en");
    expect(resolveLanguage("system", [null])).toBe("en");
    expect(resolveLanguage("system", [undefined, ""])).toBe("en");
  });

  it("lets an explicit preference win over the phone", () => {
    expect(resolveLanguage("en", ["it"])).toBe("en");
    expect(resolveLanguage("it", ["de"])).toBe("it");
  });
});

describe("loadLanguagePreference", () => {
  it("returns a stored valid preference", async () => {
    getItem.mockResolvedValue("it");
    expect(await loadLanguagePreference()).toBe("it");
    expect(getItem).toHaveBeenCalledWith("jellyboxd_language");
  });

  it.each([["fr"], [""], [null], ['{"a":1}'], ["IT"]])("falls back to 'system' for %p", async (stored) => {
    getItem.mockResolvedValue(stored);
    expect(await loadLanguagePreference()).toBe("system");
  });

  it("falls back to 'system' when SecureStore throws", async () => {
    getItem.mockRejectedValue(new Error("keychain locked"));
    expect(await loadLanguagePreference()).toBe("system");
  });
});

describe("saveLanguagePreference", () => {
  it("writes to the jellyboxd_language key", async () => {
    await saveLanguagePreference("en");
    expect(setItem).toHaveBeenCalledWith("jellyboxd_language", "en");
  });

  it("does not throw when SecureStore fails", async () => {
    setItem.mockRejectedValueOnce(new Error("nope"));
    await expect(saveLanguagePreference("it")).resolves.toBeUndefined();
  });
});
