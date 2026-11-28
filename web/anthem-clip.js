/** The French-language song file is physically trimmed from 00:02 to
 * 02:17 of the original Wikimedia Commons recording (135 seconds).
 * Award the listening bonus only when this excerpt actually finishes.
 */
export const ANTHEM_END_SECONDS = 135;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
