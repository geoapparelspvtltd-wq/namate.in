import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState } from 'react';

export default function FloatingCart() {
  const location = useLocation();
  const { items, isAnimating, animationPos, animationImage } = useCart();
  
  // Hide floating cart in reel mode (ProductDetail)
  if (location.pathname.startsWith('/product/')) return null;

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const bagRef = useRef<HTMLDivElement>(null);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (bagRef.current) {
        const rect = bagRef.current.getBoundingClientRect();
        setTargetPos({ 
          x: rect.left + rect.width / 2, 
          y: rect.top + rect.height / 2 
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [items.length]);

  return (
    <>
      {/* Flying Item Animation */}
      <AnimatePresence>
        {isAnimating && animationPos && animationImage && (
          <motion.div
            initial={{ 
              x: animationPos.x - 28,
              y: animationPos.y - 28, 
              scale: 1,
              opacity: 1,
              rotate: 0
            }}
            animate={{ 
              x: targetPos.x - 28, 
              y: targetPos.y - 28, 
              scale: 0.1,
              opacity: 0,
              rotate: 720
            }}
            transition={{ 
              duration: 0.8, 
              ease: [0.4, 0, 0.2, 1] 
            }}
            className="fixed top-0 left-0 z-[100] w-14 h-14 pointer-events-none"
          >
            <img 
              src={animationImage} 
              alt="Flying product" 
              className="w-full h-full object-cover rounded-full border-2 border-[#064e3b] shadow-xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Logo Cart Bag */}
      <div className="fixed bottom-32 right-6 z-50">
        <Link to="/cart">
          <motion.div
            ref={bagRef}
            drag
            dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 200, bottom: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isAnimating ? { 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            } : {}}
            className="relative cursor-pointer"
          >
            {/* The Logo Bag Design */}
            <div className="relative">
              {/* Bag Handles */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 border-2 border-black rounded-t-full z-0" />
              
              {/* Bag Body */}
              <div className={cn(
                "relative z-10 w-14 h-16 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center overflow-hidden transition-colors",
                itemCount > 0 ? "bg-white" : "bg-gray-50"
              )}>
                <div 
                  className="w-[90%] h-[90%] liquid-gold-icon"
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
              </div>

              {/* Item Count Badge */}
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white z-30 shadow-lg"
                  >
                    {itemCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Ripple effect when animating */}
            {isAnimating && (
              <motion.div 
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                className="absolute inset-0 bg-black rounded-full -z-10"
              />
            )}
          </motion.div>
        </Link>
      </div>
    </>
  );
}
