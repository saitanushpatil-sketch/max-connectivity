/** Light haptic tap on supported mobile devices */
export function hapticTap(pattern = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export default hapticTap;
