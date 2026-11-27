/** First refrain cadence in the 78-second CC0 Commons rendition.
 * The 78-second source contains two repeated musical sections; this shorter cut ends after the first.
 * See docs/ANDROID.md for details on the matching APK trim.
 */
export const ANTHEM_END_SECONDS = 38;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
