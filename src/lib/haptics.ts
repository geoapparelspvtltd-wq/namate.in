/**
 * Utility to trigger haptic feedback in both Web and Flutter Native environments
 */
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  // 1. Web Vibrate API (where supported)
  if ('vibrate' in navigator) {
    try {
      switch (style) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(25); break;
        case 'heavy': navigator.vibrate(50); break;
        case 'success': navigator.vibrate([10, 30, 10]); break;
        case 'warning': navigator.vibrate([30, 50, 30]); break;
        case 'error': navigator.vibrate([50, 100, 50]); break;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // 2. Flutter bridge check
  if ((window as any).FlutterNotificationChannel) {
    try {
      (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
        type: 'HAPTIC_FEEDBACK',
        style: style
      }));
    } catch (e) {
      // Ignore
    }
  }
};
