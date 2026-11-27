/** Intro + first refrain in the CC0 Commons instrumental arrangement.
 * Keep the introductory passage: the previous 38s limit stopped too early.
 * This boundary is at the final cadence, shortly before the source's end.
 */
export const ANTHEM_END_SECONDS = 76;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
