import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface BrandSignatureProps {
  className?: string;
  variant?: 'light' | 'dark' | 'gold';
}

const BrandSignature = ({ className, variant = 'gold' }: BrandSignatureProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-8 bg-current opacity-20" />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em]",
            variant === 'gold' ? "liquid-gold-text" : 
            variant === 'dark' ? "text-black/40" : "text-white/40"
          )}>
            The Namate Experience
          </span>
          <div className="h-[1px] w-8 bg-current opacity-20" />
        </div>
        
        <h2 className={cn(
          "text-2xl font-black tracking-tighter",
          variant === 'gold' ? "liquid-gold-text" : 
          variant === 'dark' ? "text-black" : "text-white"
        )}>
          NAMATE
        </h2>
        
        <p className={cn(
          "text-[8px] font-bold uppercase tracking-widest mt-1",
          variant === 'dark' ? "text-black/20" : "text-white/20"
        )}>
          Est. 2026 • Premium Apparel
        </p>
      </motion.div>
    </div>
  );
};

export default BrandSignature;
