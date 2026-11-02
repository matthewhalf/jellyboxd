/**
 * Pause before the single fallback attempt. AVKit holds the presentation back until the app's
 * rotation to landscape has finished, so a shorter wait would queue a second presentation and
 * play the fullscreen animation twice.
 */
const RETRY_DELAYS_MS = [1500];

/**
 * Asks the native player to go fullscreen, trying once more later if the first request was lost.
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
