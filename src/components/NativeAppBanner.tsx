import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, X, Download, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NativeAppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running inside the Flutter App
    const hasFlutterBridge = !!(window as any).FlutterPaymentChannel;
    setIsNative(hasFlutterBridge);

    // Detect iOS
    const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(isApple);

    // Only show if NOT native and not dismissed in this session
    const isDismissed = sessionStorage.getItem('hideAppBanner');
    if (!hasFlutterBridge && !isDismissed) {
      // Delay slightly for better entrance rhythm
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('hideAppBanner', 'true');
  };

  if (isNative || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-4 right-4 z-[60] pointer-events-auto md:hidden"
      >
        <div className="bg-black text-white rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-4 overflow-hidden relative group">
          {/* Animated Background Pulse */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              {isIOS ? (
                <Apple className="w-5 h-5 text-white" />
              ) : (
                <Smartphone className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-tighter leading-none">
                {isIOS ? "Namate for iOS" : "Get the Namate App"}
              </h4>
              <p className="text-[9px] font-medium text-white/60 mt-1 uppercase tracking-widest leading-none">
                {isIOS ? "Available on the App Store" : "Faster checkout & app-only drops"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
             <button 
                className="bg-white text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform"
                onClick={() => window.open(isIOS ? 'https://apps.apple.com' : 'https://play.google.com', '_blank')}
             >
                <Download className="w-3 h-3" />
                {isIOS ? "Get" : "Install"}
             </button>
             <button 
                onClick={dismiss}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white"
             >
                <X className="w-4 h-4" />
             </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
