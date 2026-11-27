/** Complete French-language performance of L'Internationale (Wikimedia Commons,
 * Archduke of Columbia, CC0). The preceding instrumental clip was 76 seconds.
 * Allow the media's ended event to handle small encoding-duration differences.
 */
export const ANTHEM_END_SECONDS = 148;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
