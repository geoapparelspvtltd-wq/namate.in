import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { RefreshCw } from 'lucide-react';
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
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-neutral-100 p-2.5 flex items-center justify-center pointer-events-none">
          <RefreshCw 
            className={`w-5 h-5 text-[#C5A059] ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${rotation}deg) scale(${scale})`,
              transition: isRefreshing ? undefined : 'transform 75ms linear'
            }}
            strokeWidth={2.75}
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
