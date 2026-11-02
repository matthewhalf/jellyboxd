import { enterFullscreenWithRetry } from "../fullscreen";

const noWait = () => Promise.resolve();

describe("enterFullscreenWithRetry", () => {
  it("never starts an attempt while the previous one is still running", async () => {
    let inFlight = 0;
    let overlapped = false;
    const enter = async () => {
      inFlight++;
      if (inFlight > 1) overlapped = true;
      await Promise.resolve();
      inFlight--;
    };
    await enterFullscreenWithRetry(enter, () => false, noWait);
    expect(overlapped).toBe(false);
  });

  it("stops retrying once the player is fullscreen", async () => {
    let fullscreen = false;
    const enter = jest.fn(async () => {
      fullscreen = true;
    });
    await enterFullscreenWithRetry(enter, () => fullscreen, noWait);
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("tries once more if the first request was lost, then gives up", async () => {
    const enter = jest.fn(() => undefined);
    await enterFullscreenWithRetry(enter, () => false, noWait);
    expect(enter).toHaveBeenCalledTimes(2);
  });

  it("waits long enough for the rotation to finish before trying again", async () => {
    const waits: number[] = [];
    await enterFullscreenWithRetry(
      () => undefined,
      () => false,
      async (ms) => {
        waits.push(ms);
      }
    );
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(1000);
  });

  it("keeps going after a rejected attempt", async () => {
    let fullscreen = false;
    const enter = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error("not in window"))
      .mockImplementation(async () => {
        fullscreen = true;
      });
    await enterFullscreenWithRetry(enter, () => fullscreen, noWait);
    expect(enter).toHaveBeenCalledTimes(2);
  });
});
