import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import AnimatedBrandName from './AnimatedBrandName';
import { useAuth } from '../lib/AuthContext';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const { isNative } = useAuth();

  useEffect(() => {
    // Haptic feedback when the name starts appearing
    const vibrationTimer = setTimeout(() => {
      // 1. Web Vibrate API
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([30, 50, 30]);
        } catch (e) {
          // Ignore
        }
      }
      
      // 2. Flutter Native Haptic Bridge
      if (isNative && (window as any).FlutterNotificationChannel) {
        (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
          type: 'HAPTIC_FEEDBACK',
          style: 'medium'
        }));
      }
    }, 200);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200); // 200ms for smooth exit
    }, 2500); // 2.5s total visible splash

    return () => {
      clearTimeout(timer);
      clearTimeout(vibrationTimer);
    };
  }, [onComplete, isNative]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.02,
            filter: "blur(4px)",
            transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
          }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          {/* Elegant Kinetic Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>

          {/* Luxury Floating Elements (Fewer but more high-end) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => {
              const delay = Math.random() * 2;
              const duration = Math.random() * 10 + 20;
              const size = Math.random() * 300 + 200;
              
              return (
                <motion.div
                  key={`bg-orb-${i}`}
                  initial={{ 
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: 0 
                  }}
                  animate={{ 
                    x: [null, Math.random() * window.innerWidth],
                    y: [null, Math.random() * window.innerHeight],
                    opacity: [0, 0.05, 0],
                  }}
                  transition={{ 
                    duration,
                    repeat: Infinity,
                    delay,
                    ease: "easeInOut"
                  }}
                  className="absolute bg-white rounded-full blur-[100px]"
                  style={{ width: size, height: size }}
                />
              );
            })}
          </div>

          {/* Main Logo Content */}
          <div className="flex flex-col items-center relative z-10">
            <motion.div
              initial={{ 
                scale: 0.5, 
                opacity: 0,
                y: 40,
                rotateX: 45
              }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: 0,
                rotateX: 0
              }}
              transition={{ 
                duration: 0.6, 
                ease: [0.19, 1, 0.22, 1] 
              }}
              className="mb-8 relative overflow-hidden"
            >
              <div 
                className="w-20 h-20 sm:w-28 sm:h-28 bg-white relative overflow-hidden"
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
              >
                {/* Premium Shine Effect for Splash */}
                <motion.div
                  initial={{ x: '-100%', skewX: -20 }}
                  animate={{ x: '200%' }}
                  transition={{ 
                    duration: 1.2, 
                    delay: 0.8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"
                />
              </div>
              
              {/* Luxury Glow Ring */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 -m-4 border border-white/10 rounded-full shrink-0"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.8em", y: 10 }}
              animate={{ opacity: 1, letterSpacing: "0.4em", y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-5xl font-brand font-medium text-white">N A M A T E</h1>
            </motion.div>
            
            <div className="overflow-hidden mt-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "40px" }}
                transition={{ delay: 0.4, duration: 0.5, ease: "circIn" }}
                className="h-[1px] bg-white/20 mx-auto"
              />
            </div>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-[8px] font-bold uppercase tracking-[0.6em] text-white/40 mt-6"
            >
              Crafted to be your natural companion
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
