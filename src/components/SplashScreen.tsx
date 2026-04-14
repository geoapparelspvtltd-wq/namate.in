import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import AnimatedBrandName from './AnimatedBrandName';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Haptic feedback when the name starts appearing
    const vibrationTimer = setTimeout(() => {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([30, 50, 30]);
        } catch (e) {
          // Ignore vibration errors (e.g. in some browsers/iframes)
        }
      }
    }, 600);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(vibrationTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            y: -100,
            scale: 0.5,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          }}
          onAnimationComplete={() => {
            window.location.hash = 'focus-search';
          }}
          className="fixed inset-0 z-[9999] bg-[#ffffff] flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 relative"
          >
            <div 
              className="w-24 h-24 sm:w-32 sm:h-32 bg-black"
              style={{ 
                WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </motion.div>
          
          <AnimatedBrandName 
            text="NAMATE" 
            className="text-4xl sm:text-6xl font-brand font-medium tracking-[0.4em] text-black"
            delay={0.5}
          />
          
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100px" }}
            transition={{ delay: 1.5, duration: 1, ease: "easeInOut" }}
            className="h-[2px] bg-black mt-4"
          />
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="text-[9px] font-medium uppercase tracking-[0.3em] text-black/40 mt-6 text-center px-4"
          >
            Crafted to be your natural companion
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
