/** French-language CC0 performance of L'Internationale, cropped in playback
 * at the cadence after its first refrain (about 47% of the 148s recording).
 * The source MP3 remains unchanged; the player stops and rewards at this point.
 */
export const ANTHEM_END_SECONDS = 70;
export const anthemClipFinished = seconds =>
  Number.isFinite(seconds) && seconds >= ANTHEM_END_SECONDS - 0.25;
