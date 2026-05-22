import { Link, useLocation } from 'react-router-dom';
import { Crown, LayoutGrid, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import RegalDiamond from './RegalDiamond';
import { memo } from 'react';
import { motion } from 'motion/react';

import { useState, useEffect } from 'react';

import { triggerHaptic } from '@/lib/haptics';

const BottomNav = memo(() => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide bottom nav in reel mode (ProductDetail)
  if (location.pathname.startsWith('/product/')) return null;

  const NavLink = ({ to, children, isActive, isRegal = false }: any) => (
    <Link 
      to={to} 
      onClick={() => triggerHaptic(isActive ? 'light' : 'medium')}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-500 relative",
        isRegal 
          ? cn("w-11 h-11 rounded-[16px] my-0.5", isActive ? "bg-black scale-105 shadow-2xl shadow-black/30" : "bg-black/10 text-black hover:bg-black")
          : cn("w-9 h-9 rounded-full", isActive ? "bg-black text-white scale-105 shadow-lg shadow-black/10" : "text-black/40 hover:text-black hover:bg-black/5")
      )}
    >
      {children}
      {isActive && !isRegal && (
        <motion.div 
          layoutId="activeTabBottom"
          className="absolute -left-1.5 w-1 h-3 bg-[#C5A059] rounded-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );

  return (
    <div className="fixed right-0 bottom-24 z-50 pointer-events-none translate-y-0">
      <div className={cn(
        "flex flex-col items-center justify-center gap-2.5 p-2 transition-all duration-700 pointer-events-auto",
        "bg-white/70 backdrop-blur-2xl border-l border-y border-black/[0.03] shadow-[0_8px_40px_rgba(0,0,0,0.03)] rounded-l-[32px]"
      )}>
        {/* Home */}
        <NavLink to="/" isActive={location.pathname === '/'}>
          <Home className="w-4 h-4" />
        </NavLink>

        {/* Categories */}
        <NavLink to="/shop" isActive={location.pathname === '/shop'}>
          <LayoutGrid className="w-4 h-4" />
        </NavLink>

        {/* Logo / Regal (Central Action) */}
        <NavLink to="/regal" isActive={location.pathname === '/regal'} isRegal={true}>
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <motion.div 
              animate={location.pathname === '/regal' ? { rotate: 360 } : { rotate: 0 }}
              whileHover={{ scale: 1.2, rotate: 360 }}
              whileTap={{ scale: 0.9 }}
              transition={{ 
                rotate: { duration: 0.5, ease: "easeInOut" },
                scale: { type: "spring", stiffness: 300, damping: 20 }
              }}
              className={cn(
                "w-7 h-7 relative",
                location.pathname === '/regal' ? "bg-white" : "bg-black"
              )}
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
            >
              {/* Premium Shine Effect */}
              <motion.div
                initial={{ x: '-100%', skewX: -20 }}
                whileHover={{ x: '200%' }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"
              />
            </motion.div>
          </div>
        </NavLink>

        {/* Sale */}
        <NavLink to="/sale" isActive={location.pathname === '/sale'}>
          <span className="text-[6px] font-brand font-black uppercase tracking-widest rotate-90">SALE</span>
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" isActive={location.pathname === '/profile'}>
          <User className="w-4 h-4" />
        </NavLink>
      </div>
    </div>
  );
});

export default BottomNav;
