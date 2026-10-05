import {
  createTranslator,
  getCurrentLanguage,
  setCurrentLanguage,
  subscribeLanguage,
  type Language,
} from "../translate";

const dicts = {
  en: {
    greet: "Hi {name}",
    episode_one: "{count} episode",
    episode_other: "{count} episodes",
    onlyEnglish: "only English",
    nested: { a: "A" },
  },
  it: {
    greet: "Ciao {name}",
    episode_one: "{count} episodio",
    episode_other: "{count} episodi",
    nested: { a: "A it" },
  },
};

let language: Language = "en";
const tr = createTranslator(dicts, () => language);

beforeEach(() => {
  language = "en";
});

describe("createTranslator", () => {
  it("interpolates named params", () => {
    expect(tr("greet", { name: "Ada" })).toBe("Hi Ada");
    language = "it";
    expect(tr("greet", { name: "Ada" })).toBe("Ciao Ada");
  });

  it("resolves nested dotted keys", () => {
    expect(tr("nested.a")).toBe("A");
    language = "it";
    expect(tr("nested.a")).toBe("A it");
  });

  it("picks English plural forms: 0 and 2 and 21 are 'other', 1 is 'one'", () => {
    expect(tr("episode", { count: 0 })).toBe("0 episodes");
    expect(tr("episode", { count: 1 })).toBe("1 episode");
    expect(tr("episode", { count: 2 })).toBe("2 episodes");
    expect(tr("episode", { count: 21 })).toBe("21 episodes");
  });

  it("picks Italian plural forms", () => {
    language = "it";
    expect(tr("episode", { count: 0 })).toBe("0 episodi");
    expect(tr("episode", { count: 1 })).toBe("1 episodio");
    expect(tr("episode", { count: 21 })).toBe("21 episodi");
  });

  it("falls back to English when the current language lacks the key", () => {
    language = "it";
    expect(tr("onlyEnglish")).toBe("only English");
  });

  it("returns the key itself when no language has it", () => {
    expect(tr("does.not.exist")).toBe("does.not.exist");
  });

  it("leaves an unknown placeholder untouched instead of printing 'undefined'", () => {
    expect(tr("greet")).toBe("Hi {name}");
  });
});

describe("current language", () => {
  it("defaults to English", () => {
    expect(getCurrentLanguage()).toBe("en");
  });

  it("notifies subscribers once per change and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLanguage(listener);
    setCurrentLanguage("it");
    expect(getCurrentLanguage()).toBe("it");
    expect(listener).toHaveBeenCalledTimes(1);
    setCurrentLanguage("it");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setCurrentLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
