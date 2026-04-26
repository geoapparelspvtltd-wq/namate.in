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
            scale: 0.8,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          }}
          onAnimationComplete={() => {
            window.location.hash = 'focus-search';
          }}
          className="fixed inset-0 z-[9999] bg-[#ffffff] flex flex-col items-center justify-center overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          {/* 3D Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  z: -500,
                  x: Math.random() * window.innerWidth - window.innerWidth / 2,
                  y: Math.random() * window.innerHeight - window.innerHeight / 2
                }}
                animate={{ 
                  opacity: [0, 0.2, 0],
                  z: [ -500, 500 ],
                }}
                transition={{ 
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear"
                }}
                className="absolute left-1/2 top-1/2 w-1 h-1 bg-black rounded-full"
                style={{ transformStyle: 'preserve-3d' }}
              />
            ))}
          </div>

          <motion.div
            initial={{ 
              scale: 0.8, 
              opacity: 0,
              rotateX: 45,
              rotateY: -45,
              translateZ: -200
            }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              rotateX: 0,
              rotateY: 0,
              translateZ: 0
            }}
            transition={{ 
              duration: 1.5, 
              ease: [0.23, 1, 0.32, 1] 
            }}
            className="mb-12 relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Logo Shadow */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.1, scale: 1 }}
              transition={{ duration: 1.5, delay: 0.2 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-[100%] blur-xl"
            />

            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotateY: [-5, 5, -5],
                rotateX: [5, -5, 5]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="w-24 h-24 sm:w-32 sm:h-32 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
              style={{ 
                WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                transformStyle: 'preserve-3d',
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, z: -100 }}
            animate={{ opacity: 1, z: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <AnimatedBrandName 
              text="NAMATE" 
              className="text-4xl sm:text-6xl font-brand font-medium tracking-[0.4em] text-black"
              delay={0.5}
            />
          </motion.div>
          
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "120px", opacity: 1 }}
            transition={{ delay: 1.5, duration: 1, ease: "easeInOut" }}
            className="h-[1px] bg-black mt-4"
          />
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
            className="text-[9px] font-medium uppercase tracking-[0.3em] text-black/40 mt-8 text-center px-4 max-w-[280px] leading-loose"
          >
            Crafted to be your natural companion
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
