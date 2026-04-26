import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag } from 'lucide-react';

interface FloatingBagProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function FloatingBag({ isVisible, onComplete }: FloatingBagProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0.5, 1.5, 1],
            y: -100,
            x: [0, -20, 20, 0]
          }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
          className="fixed pointer-events-none z-[100] text-black"
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <ShoppingBag className="w-12 h-12 fill-current shadow-2xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
