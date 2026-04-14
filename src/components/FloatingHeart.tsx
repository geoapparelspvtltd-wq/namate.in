import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';

interface FloatingHeartProps {
  isVisible: boolean;
  onComplete: () => void;
}

export default function FloatingHeart({ isVisible, onComplete }: FloatingHeartProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0.5, 1.5, 1],
            y: -100,
            x: [0, 20, -20, 0]
          }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
          className="fixed pointer-events-none z-[100] text-[#064e3b]"
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <Heart className="w-12 h-12 fill-current shadow-2xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
