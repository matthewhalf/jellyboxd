/** Pause between fullscreen attempts, long enough for the presentation to report itself. */
const RETRY_DELAYS_MS = [150, 250, 400];

/**
 * Asks the native player to go fullscreen, retrying while the view isn't attached to the window yet.
 *
 * expo-video's enterFullscreen() has no "already presenting" guard and resolves whether or not
 * the presentation started. Attempts therefore run strictly one after the other: a second call
 * landing while AVPlayerViewController is mid-presentation throws a UIKit exception and crashes the app.
 */
export async function enterFullscreenWithRetry(
  enter: () => Promise<void> | undefined,
  shouldStop: () => boolean,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (shouldStop()) return;
    try {
      await enter();
    } catch {}
    if (attempt === RETRY_DELAYS_MS.length) return;
    await wait(RETRY_DELAYS_MS[attempt]);
  }
}
