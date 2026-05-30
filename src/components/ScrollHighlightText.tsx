import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ScrollHighlightTextProps {
  text: string;
}

export const ScrollHighlightText = ({ text }: ScrollHighlightTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track viewport overlap for triggering word-by-word active scroll highlight.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.35"]
  });

  const words = text ? text.split(/\s+/) : [];

  return (
    <div ref={containerRef} className="px-6 py-16 text-center select-none bg-black/[0.015] border-t border-neutral-200/50 mt-4 relative">
      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-[#C5A059] mb-4">Our Character</p>
      <div className="max-w-md mx-auto leading-relaxed text-lg sm:text-xl font-brand font-medium tracking-tight flex flex-wrap justify-center text-center">
        {words.map((word, index) => {
          const start = index / words.length;
          const end = Math.min(1, (index + 1.8) / words.length); // organic overlap for effortless readability
          
          const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1], { clamp: true });
          const color = useTransform(scrollYProgress, [start, end], ['#a3a3a3', '#000000'], { clamp: true });
          
          return (
            <motion.span 
              key={index} 
              style={{ opacity, color }} 
              className="inline-block mr-1.5 mb-1 transition-all duration-100"
            >
              {word}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
};
