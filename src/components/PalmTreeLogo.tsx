import React from 'react';

export function PalmTreeLogo({ className = "w-10 h-10", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" className={className} {...props}>
      {/* Sleek Minimal Palm Trunk */}
      <path d="M48 90 Q 49 50 50 25 Q 51 50 52 90 Z" fill="currentColor" />
      {/* Sleek Palm Leaves drooping elegantly */}
      {/* Top Left Leaf */}
      <path d="M50 25 Q 38 15 22 25 Q 36 30 50 25" fill="currentColor" />
      {/* Top Right Leaf */}
      <path d="M50 25 Q 62 15 78 25 Q 64 30 50 25" fill="currentColor" />
      {/* Mid Left Leaf */}
      <path d="M50 25 Q 30 25 15 42 Q 32 40 49 28" fill="currentColor" />
      {/* Mid Right Leaf */}
      <path d="M50 25 Q 70 25 85 42 Q 68 40 51 28" fill="currentColor" />
      {/* Bottom Left Leaf */}
      <path d="M50 25 Q 26 38 18 58 Q 33 50 48 31" fill="currentColor" />
      {/* Bottom Right Leaf */}
      <path d="M50 25 Q 74 38 82 58 Q 67 50 52 31" fill="currentColor" />
    </svg>
  );
}
