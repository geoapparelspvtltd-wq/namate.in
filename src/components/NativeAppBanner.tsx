import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export function NativeAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running inside the Flutter App
    const hasFlutterBridge = !!(window as any).FlutterPaymentChannel || 
                             navigator.userAgent.includes('Flutter') ||
                             (window as any).isFlutterApp;
    setIsNative(hasFlutterBridge);

    // Detect iOS
    const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(isApple);

    // Only show if NOT native and not dismissed in this session/localStorage
    const isDismissed = sessionStorage.getItem('hideAppBanner') || localStorage.getItem('hideAppBanner');
    if (!hasFlutterBridge && !isDismissed) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      document.documentElement.style.setProperty('--app-banner-height', '64px');
    } else {
      document.documentElement.style.setProperty('--app-banner-height', '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--app-banner-height', '0px');
    };
  }, [isVisible]);

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('hideAppBanner', 'true');
    localStorage.setItem('hideAppBanner', 'true');
  };

  if (isNative || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -70, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[110] w-full md:max-w-[430px] bg-[#FAF2EB] text-black border-b border-black/[0.04] px-4 h-16 flex items-center justify-between pointer-events-auto select-none font-sans"
      >
        <div className="flex items-center gap-3">
          {/* Custom brand icon matching Snitch mockup with high quality */}
          <div className="w-[38px] h-[38px] bg-black rounded-xl flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
            {/* Minimal Geometric logo representing Namate */}
            <svg viewBox="0 0 100 100" className="w-[20px] h-[20px] text-[#C5A059]" fill="currentColor">
              <path d="M10 10 H30 L70 90 H90 V10 H70 L30 90 H10 Z" />
            </svg>
            <div className="absolute inset-0 border border-white/5 rounded-xl pointer-events-none" />
          </div>

          <div className="flex flex-col text-left">
            <h4 className="text-[10.5px] font-black font-brand uppercase tracking-wider text-black leading-tight">
              NAMATE is better on the app
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8.5px] font-bold text-black/60 tracking-wider">
                Extra 10% off
              </span>
              <span className="w-0.5 h-2.5 bg-black/15" />
              <span className="text-[8.5px] font-black text-[#C5A059] tracking-widest uppercase">
                Code: APP10
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              window.open(isIOS ? 'https://apps.apple.com' : 'https://play.google.com', '_blank');
            }}
            className="bg-black hover:bg-neutral-800 text-white font-brand font-black text-[9.5px] uppercase tracking-[0.18em] px-4.5 py-2.5 rounded-none transition-all active:scale-95 shadow-sm"
          >
            OPEN
          </button>
          
          <button
            onClick={dismiss}
            className="p-1 text-black/40 hover:text-black transition-colors"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
