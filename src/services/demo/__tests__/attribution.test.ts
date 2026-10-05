import { DEMO_ATTRIBUTION } from "../attribution";
import { DEMO_EPISODES, DEMO_MOVIES } from "../fixtures";

describe("DEMO_ATTRIBUTION", () => {
  it("credits every film and episode in the demo catalog", () => {
    for (const item of [...DEMO_MOVIES, ...DEMO_EPISODES]) {
      expect(DEMO_ATTRIBUTION).toContain(item.Name);
    }
  });

  it("names the licenses and the Blender Foundation", () => {
    expect(DEMO_ATTRIBUTION).toContain("Blender");
    expect(DEMO_ATTRIBUTION).toContain("CC BY");
  });
});
