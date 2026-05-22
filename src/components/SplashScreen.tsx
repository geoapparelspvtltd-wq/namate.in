import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const { isNative } = useAuth();
  
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSrcs = [
    "https://i.postimg.cc/wTBMVB6g/Gemini-Generated-Image-22c90822c90822c9-copy.png"
  ];

  const handleLogoError = () => {
    // Already using the correct direct link
  };

  useEffect(() => {
    // Elegant progressing loader animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Haptic feedback when name starts appearing
    const vibrationTimer = setTimeout(() => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([30, 50, 30]);
        } catch (e) {
          // Ignore
        }
      }
      
      if (isNative && (window as any).FlutterNotificationChannel) {
        (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
          type: 'HAPTIC_FEEDBACK',
          style: 'medium'
        }));
      }
    }, 250);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2600);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      clearTimeout(vibrationTimer);
    };
  }, [onComplete, isNative]);

  const brandChars = ["N", "A", "M", "A", "T", "E"];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.015,
            filter: "blur(4px)",
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 z-[9999] bg-[#F7F4F0] flex flex-col justify-between py-20 px-8 overflow-hidden select-none"
        >
          {/* Subtle Organic Seed/Linen Fiber texture overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[#111] mix-blend-overlay" />

          {/* Minimal Header Accent */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-between items-center w-full max-w-xs mx-auto"
          >
            <span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-[#111]/30">PREMIUM COTTON & LINEN</span>
            <span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-[#111]/30">EST. 2026</span>
          </motion.div>

          {/* Main Focused Logo Group */}
          <div className="flex flex-col items-center justify-center relative z-10 py-16">
            {/* Elegant Custom Image Logo with soft breathing transition */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 relative"
            >
              <div className="absolute inset-x-0 -bottom-4 mx-auto w-12 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/20 to-transparent blur-[1px]" />
              <img 
                src={logoSrcs[logoIndex]} 
                onError={handleLogoError} 
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mix-blend-multiply" 
                alt="Brand Logo"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            {/* Staggered elegant font letters */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-3">
              {brandChars.map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: 0.15 + (index * 0.08), 
                    duration: 0.8, 
                    ease: [0.16, 1, 0.3, 1] 
                  }}
                  className="text-2xl sm:text-3.5xl font-brand font-black text-[#111] tracking-[0.1em]"
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* Luxurious subtle subtitle */}
            <motion.div
              initial={{ opacity: 0, letterSpacing: '0.1em' }}
              animate={{ opacity: 1, letterSpacing: '0.5em' }}
              transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
              className="text-[8px] font-black uppercase text-[#C5A059] tracking-[0.5em] -mr-[0.5em] text-center"
            >
              HANDCRAFTED APPAREL
            </motion.div>
          </div>

          {/* Minimalist Footing with Thin Elegant Line Loader */}
          <div className="w-full max-w-xs mx-auto flex flex-col items-center space-y-6 relative z-10">
            {/* Linear Fine Timeline Progress Bar */}
            <div className="w-full h-[1px] bg-[#111]/5 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-[#111]/30"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            
            {/* Bottom Slogan matches mockup exactly */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-2.5"
            >
              <span className="text-[8px] font-black uppercase tracking-[0.35em] text-[#111]/45">
                CRAFTED TO BE
              </span>
              <div className="w-10 h-[1.5px] bg-[#C5A059] opacity-75" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#111]">
                YOUR NATURAL COMPANION.
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
