import { setCurrentLanguage, t } from "../translate";
import { formatMinutes } from "../format";

afterEach(() => setCurrentLanguage("en"));

describe("formatMinutes", () => {
  it.each(["en", "it"] as const)("formats minutes, whole hours and hours with minutes in %s", (language) => {
    setCurrentLanguage(language);
    expect(formatMinutes(1, t)).toBe("1 min");
    expect(formatMinutes(45, t)).toBe("45 min");
    expect(formatMinutes(59, t)).toBe("59 min");
    expect(formatMinutes(60, t)).toBe("1 h");
    expect(formatMinutes(125, t)).toBe("2 h 5 min");
    expect(formatMinutes(180, t)).toBe("3 h");
  });
});
