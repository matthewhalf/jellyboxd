import * as SecureStore from "expo-secure-store";
import { applyPreference, initLanguage } from "../controller";
import { getCurrentLanguage, setCurrentLanguage, subscribeLanguage } from "../translate";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  setCurrentLanguage("en");
});

describe("initLanguage", () => {
  it("uses the phone language when nothing is saved", async () => {
    getItem.mockResolvedValue(null);
    expect(await initLanguage(["it"])).toEqual({ preference: "system", language: "it" });
    expect(getCurrentLanguage()).toBe("it");
  });

  it("lets a saved preference win over the phone", async () => {
    getItem.mockResolvedValue("en");
    expect(await initLanguage(["it"])).toEqual({ preference: "en", language: "en" });
    expect(getCurrentLanguage()).toBe("en");
  });
});

describe("applyPreference", () => {
  it("saves, switches the current language and notifies subscribers", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLanguage(listener);
    expect(await applyPreference("it", ["en"])).toBe("it");
    expect(setItem).toHaveBeenCalledWith("jellyboxd_language", "it");
    expect(getCurrentLanguage()).toBe("it");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("'system' goes back to the phone language", async () => {
    await applyPreference("en", ["it"]);
    expect(await applyPreference("system", ["it"])).toBe("it");
    expect(getCurrentLanguage()).toBe("it");
  });
});
