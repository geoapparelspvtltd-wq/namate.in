import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface RegalDiamondProps {
  className?: string;
  size?: number;
}

export default function RegalDiamond({ className, size = 120 }: RegalDiamondProps) {
  const text = "Regal • Regal • Regal • ";
  const uniqueId = React.useId().replace(/:/g, "");
  
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Deep Black Base with Internal Green Glow & Shimmer */}
      <div 
        className="absolute inset-0 bg-black rounded-full shadow-[0_0_50px_rgba(0,0,0,1),inset_0_0_30px_rgba(2,48,32,0.1)] overflow-hidden"
        style={{ width: size * 1.2, height: size * 1.2, left: -size * 0.1, top: -size * 0.1 }}
      >
        <motion.div
          animate={{ x: [-size * 1.2, size * 1.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent skew-x-12"
        />
      </div>

      {/* Ethereal Orbiting Text (Emerald) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          style={{ 
            width: size * 2.1, 
            height: size * 2.1,
            transformStyle: "preserve-3d",
            rotateX: "75deg"
          }}
          className="flex items-center justify-center"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <defs>
              <path id={`textCircle-${uniqueId}`} d="M 50, 50 m -48, 0 a 48,48 0 1,1 96,0 a 48,48 0 1,1 -96,0" />
              <filter id={`textGlow-${uniqueId}`}>
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <text 
              className="fill-white font-normal text-[12px] tracking-[0.3em]"
              style={{ 
                filter: `url(#textGlow-${uniqueId})`, 
                opacity: 0.6,
                fontFamily: "'Pinyon Script', cursive"
              }}
            >
              <textPath href={`#textCircle-${uniqueId}`}>
                {text}
              </textPath>
            </text>
          </svg>
        </motion.div>
      </div>

      {/* Volumetric Emerald Bloom */}
      <motion.div
        animate={{ 
          scale: [1.2, 1.6, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute inset-0 bg-emerald-500/10 blur-[20px] rounded-full"
      />

      {/* The Crystalline Emerald Diamond with Complex "Upside" Cut */}
      <motion.div
        animate={{ 
          y: [0, -25, 0],
          rotateY: [0, 45, -45, 0],
          scale: [1.2, 1.35, 1.2],
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <defs>
            {/* Emerald Diamond Gradients */}
            <linearGradient id={`crownGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            
            <linearGradient id={`pavilionGrad-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#023020" />
            </linearGradient>

            {/* Prismatic Dispersion (Emerald Fire) */}
            <radialGradient id={`prismFire-${uniqueId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.2" />
              <stop offset="75%" stopColor="#023020" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <linearGradient id={`scintillation-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="49%" stopColor="transparent" />
              <stop offset="50%" stopColor="#d1fae5" stopOpacity="0.8" />
              <stop offset="51%" stopColor="transparent" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          
          {/* Complex "Cut" Geometry */}
          {/* Main Pavilion (Bottom) */}
          <path d="M10 35 L50 95 L90 35 Z" fill={`url(#pavilionGrad-${uniqueId})`} />
          
          {/* Internal Pavilion Facets */}
          <path d="M10 35 L50 95 L50 35 Z" fill="rgba(0,0,0,0.25)" />
          <path d="M90 35 L50 95 L50 35 Z" fill="rgba(255,255,255,0.15)" />
          <path d="M30 35 L50 95 L50 35 Z" fill="rgba(0,0,0,0.1)" />
          <path d="M70 35 L50 95 L50 35 Z" fill="rgba(255,255,255,0.05)" />

          {/* Crown (Top "Upside" Cut) - 5-point silhouette */}
          <path d="M10 35 L25 10 L50 5 L75 10 L90 35 Z" fill={`url(#crownGrad-${uniqueId})`} />
          
          {/* Crown Facets (The "Cuts") */}
          <path d="M10 35 L25 10 L50 35 Z" fill="rgba(255,255,255,0.5)" />
          <path d="M90 35 L75 10 L50 35 Z" fill="rgba(0,0,0,0.1)" />
          <path d="M25 10 L50 5 L50 35 Z" fill="rgba(255,255,255,0.7)" />
          <path d="M75 10 L50 5 L50 35 Z" fill="rgba(255,255,255,0.3)" />
          
          {/* Table (Top Face) */}
          <path d="M25 10 L75 10 L50 35 Z" fill="rgba(255,255,255,0.15)" />

          {/* Prismatic "Fire" Glints */}
          <motion.circle
            cx="40" cy="40" r="15"
            fill={`url(#prismFire-${uniqueId})`}
            animate={{ 
              opacity: [0, 0.5, 0],
              scale: [0.8, 1.4, 0.8],
              rotate: [0, 360]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="60" cy="50" r="12"
            fill={`url(#prismFire-${uniqueId})`}
            animate={{ 
              opacity: [0, 0.4, 0],
              scale: [1, 1.8, 1],
              rotate: [360, 0]
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />

          {/* Sharp Scintillation Sweeps */}
          <motion.path
            d="M10 35 L90 35 L50 95 Z"
            fill={`url(#scintillation-${uniqueId})`}
            animate={{ 
              x: [-50, 50],
              y: [-30, 30],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />

          {/* REGAL Text with Emerald Clarity */}
          <motion.g
            animate={{ 
              filter: [
                'drop-shadow(0 0 8px rgba(16,185,129,0.8))',
                'drop-shadow(0 0 20px rgba(16,185,129,1))',
                'drop-shadow(0 0 8px rgba(16,185,129,0.8))'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <text
              x="50"
              y="35"
              textAnchor="middle"
              className="fill-white font-normal text-[28px] tracking-tight pointer-events-none"
              style={{ 
                textShadow: '0 0 15px rgba(16,185,129,0.6)',
                fontFamily: "'Pinyon Script', cursive"
              }}
            >
              Regal
            </text>
          </motion.g>

          {/* Text Shimmer */}
          <defs>
            <clipPath id={`regalClip-${uniqueId}`}>
              <text 
                x="50" 
                y="35" 
                textAnchor="middle" 
                className="font-normal text-[28px] tracking-tight"
                style={{ fontFamily: "'Pinyon Script', cursive" }}
              >
                Regal
              </text>
            </clipPath>
          </defs>
          <motion.rect
            x="15" y="20" width="70" height="20"
            fill={`url(#scintillation-${uniqueId})`}
            clipPath={`url(#regalClip-${uniqueId})`}
            animate={{ x: [-70, 70] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* Emerald Scintillation Sparkles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1.8, 0],
            rotate: [0, 180]
          }}
          transition={{ 
            duration: 1 + Math.random(), 
            repeat: Infinity, 
            delay: Math.random() * 4 
          }}
          className="absolute w-6 h-6 flex items-center justify-center pointer-events-none"
          style={{ 
            top: `${20 + Math.random() * 60}%`, 
            left: `${20 + Math.random() * 60}%` 
          }}
        >
          <div className="absolute w-full h-[1px] bg-emerald-300 blur-[0.5px]" />
          <div className="absolute h-full w-[1px] bg-emerald-300 blur-[0.5px]" />
          <div className="w-2 h-2 bg-emerald-400 rounded-full blur-[2px]" />
        </motion.div>
      ))}
    </div>
  );
}
