import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface AnimatedBrandNameProps {
  text?: string;
  className?: string;
  delay?: number;
}

export default function AnimatedBrandName({ 
  text = "NAMATE", 
  className,
  delay = 0 
}: AnimatedBrandNameProps) {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      translateZ: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      rotateX: -90,
      translateZ: -50,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      style={{ 
        display: "flex", 
        overflow: "hidden",
        perspective: "500px",
        transformStyle: "preserve-3d"
      }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={cn("inline-flex", className)}
    >
      {letters.map((letter, index) => (
        <motion.span
          variants={child}
          key={index}
          className="inline-block"
          style={{ 
            marginRight: letter === " " ? "0.25em" : "0",
            transformStyle: "preserve-3d"
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
}
