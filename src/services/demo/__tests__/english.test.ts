import { DEMO_ATTRIBUTION } from "../attribution";
import { DEMO_EPISODES, DEMO_LIBRARIES, DEMO_MOVIES, DEMO_SEASONS, DEMO_SERIES } from "../fixtures";

const ITALIAN = /[àèéìòù]|\b(il|lo|la|gli|di|del|della|dei|un|una|che|con|per|tra|stagione|serie|animazione|commedia|nel|nella|non è)\b/i;

function visibleText(): string[] {
  const items = [...DEMO_LIBRARIES, ...DEMO_MOVIES, ...DEMO_SERIES, ...DEMO_SEASONS, ...DEMO_EPISODES];
  return items.flatMap((i) => [i.Name, i.Overview, i.SeasonName, ...(i.Genres ?? [])]).filter((t): t is string => !!t);
}

describe("demo content is in English", () => {
  it("has no Italian in names, overviews, seasons or genres", () => {
    for (const text of visibleText()) {
      expect({ text, italian: ITALIAN.test(text) }).toEqual({ text, italian: false });
    }
  });

  it("names the libraries Movies and TV Shows", () => {
    expect(DEMO_LIBRARIES.map((l) => l.Name)).toEqual(["Movies", "TV Shows"]);
  });

  it("has an English attribution", () => {
    expect(ITALIAN.test(DEMO_ATTRIBUTION)).toBe(false);
    expect(DEMO_ATTRIBUTION).toContain("not affiliated");
  });
});
