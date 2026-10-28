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

  it("retries while the view isn't attached, then gives up", async () => {
    const enter = jest.fn(() => undefined);
    await enterFullscreenWithRetry(enter, () => false, noWait);
    expect(enter).toHaveBeenCalledTimes(4);
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
