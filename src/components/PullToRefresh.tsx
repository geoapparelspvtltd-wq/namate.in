import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { triggerHaptic } from '@/lib/haptics';
import { useAuth } from '@/lib/AuthContext';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const { isNative } = useAuth();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullThreshold = 75; // px trigger threshold
  const maxPull = 120; // px cap

  useEffect(() => {
    if (isNative) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if scrolled fully to the top
      if (window.scrollY <= 2 && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      } else {
        isPulling.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      if (deltaY > 0 && window.scrollY <= 2) {
        // Apply smooth resistance (dampening) to pull gestural depth
        const dampenedDistance = Math.min(maxPull, Math.pow(deltaY, 0.82) * 0.65);
        setPullDistance(dampenedDistance);

        // Prevent default native page bounce/overscroll only when pulling
        if (dampenedDistance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        isPulling.current = false;
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;

      if (pullDistance >= pullThreshold) {
        triggerRefresh();
      } else {
        // Reset back to normal smoothly with CSS transition
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setPullDistance(pullThreshold); // Settle spinner state
    triggerHaptic('success');

    // Simulate standard refresh or reload the dynamic views
    setTimeout(() => {
      window.location.reload();
    }, 1100);
  };

  if (isNative) {
    return <>{children}</>;
  }

  // Convert pull ratio to active rotation angles and scale factors for extreme responsiveness
  const rotation = (pullDistance / pullThreshold) * 360;
  const opacity = Math.min(1, pullDistance / pullThreshold);
  const scale = Math.min(1.1, pullDistance / pullThreshold);

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Absolute top loading state display */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-75 pointer-events-none z-[120]"
        style={{ 
          height: `${pullDistance}px`,
          opacity: opacity,
          transform: `translateY(${Math.min(15, pullDistance * 0.15)}px)`
        }}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-xl border border-black/[0.04] w-12 h-12 flex items-center justify-center pointer-events-none relative overflow-hidden transition-all duration-200">
          {/* Elegant luxury outer orbital spinner ring */}
          <div 
            className={`absolute inset-1 rounded-full border border-transparent border-t-[#C5A059] border-r-[#C5A059]/30 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              transition: isRefreshing ? undefined : 'transform 75ms linear',
              borderWidth: '1.75px'
            }}
          />
          
          {/* Inner Brand Image Logo staying right-side-up and acting premium */}
          <img 
            src="https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png"
            className={`w-6 h-6 object-contain transition-transform duration-300 ${isRefreshing ? 'animate-pulse scale-[0.85]' : ''}`}
            style={{ 
              transform: isRefreshing ? undefined : `scale(${scale})`,
              transition: isRefreshing ? undefined : 'transform 75ms linear'
            }}
            alt="Namate Logo"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Main App Content that slides down when pulled */}
      <div 
        className="w-full h-full"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.45}px)` : 'none',
          transition: isPulling.current ? 'none' : 'transform 300ms cubic-bezier(0.19, 1, 0.22, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
