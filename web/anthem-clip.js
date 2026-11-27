/** Second and final refrain cadence in the 78-second CC0 Commons rendition.
 * The final two seconds of the source contain near-silence.
 * See docs/ANDROID.md for details on the matching APK trim.
 */
export const ANTHEM_END_SECONDS = 76;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
