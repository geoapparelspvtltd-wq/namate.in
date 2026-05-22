import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function FloatingCart() {
  const location = useLocation();
  const { isAnimating, animationPos, animationImage } = useCart();
  
  // Hide in reel mode or cart page
  if (location.pathname.startsWith('/product/') || location.pathname === '/cart') return null;

  const [navbarBagPos, setNavbarBagPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleBagPos = (e: any) => {
      setNavbarBagPos(e.detail);
    };
    window.addEventListener('cart-bag-pos', handleBagPos);
    return () => window.removeEventListener('cart-bag-pos', handleBagPos);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isAnimating && animationPos && navbarBagPos && (
          <>
            {/* The Animating Bag: Flies to product, scales up, catches item, flies back */}
            <motion.div
              initial={{ 
                x: navbarBagPos.x - 30, 
                y: navbarBagPos.y - 30, 
                scale: 0.6,
                opacity: 1
              }}
              animate={{ 
                x: [navbarBagPos.x - 30, animationPos.x - 40, animationPos.x - 40, navbarBagPos.x - 30],
                y: [navbarBagPos.y - 30, animationPos.y - 40, animationPos.y - 40, navbarBagPos.y - 30],
                scale: [0.6, 2, 2, 0.6],
              }}
              transition={{ 
                duration: 1.2, 
                times: [0, 0.35, 0.75, 1],
                ease: [0.34, 1.56, 0.64, 1] // Bouncy
              }}
              className="fixed top-0 left-0 z-[10000] pointer-events-none"
            >
              <div className="relative w-20 h-20 bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center border border-black/5">
                <div className="relative scale-[0.8] origin-center -rotate-6">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                    <div className="w-5 h-7 border-[2px] border-[#8B7355]/40 rounded-t-lg" />
                  </div>
                  <div className="relative z-10 w-11 h-13 bg-[#C4A484] border-[1px] border-[#8B7355]/30 flex items-center justify-center rounded-px shadow-sm">
                    <div 
                      className="w-[50%] h-[50%] bg-black/60"
                      style={{ 
                        WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                        maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* The Flying Product Image: Joins the bag at its peak */}
            {animationImage && (
              <motion.div
                initial={{ 
                  x: animationPos.x - 32, 
                  y: animationPos.y - 32, 
                  scale: 1,
                  opacity: 0,
                  rotate: 0
                }}
                animate={{ 
                  x: [animationPos.x - 32, animationPos.x - 10, navbarBagPos.x - 16],
                  y: [animationPos.y - 32, animationPos.y - 10, navbarBagPos.y - 16],
                  scale: [1, 1.2, 0],
                  opacity: [0, 1, 1, 0],
                  rotate: [0, 15, 360]
                }}
                transition={{ 
                  duration: 1.2,
                  times: [0, 0.4, 0.9, 1],
                  ease: "easeInOut"
                }}
                className="fixed top-0 left-0 z-[10001] w-16 h-16 pointer-events-none"
              >
                <img 
                  src={animationImage} 
                  alt="Product" 
                  className="w-full h-full object-cover rounded-full border-2 border-white shadow-xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
