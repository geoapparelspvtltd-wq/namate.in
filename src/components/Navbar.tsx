import { Link, useLocation } from 'react-router-dom';
import { Heart, Search, ChevronLeft, Home, Bell } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { useSearch } from '@/lib/SearchContext';
import { useCart } from '@/lib/CartContext';
import { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { triggerHaptic } from '@/lib/haptics';

const Navbar = memo(() => {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { searchQuery, setSearchQuery } = useSearch();
  const { items } = useCart();
  const { user, role, isNative } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const bagRef = useRef<HTMLDivElement>(null);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const updateBagPos = () => {
      if (bagRef.current) {
        const rect = bagRef.current.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('cart-bag-pos', { 
          detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } 
        }));
      }
    };

    updateBagPos();
    window.addEventListener('scroll', updateBagPos);
    window.addEventListener('resize', updateBagPos);
    return () => {
      window.removeEventListener('scroll', updateBagPos);
      window.removeEventListener('resize', updateBagPos);
    };
  }, [itemCount, scrolled]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide navbar in reel mode (ProductDetail)
  if (location.pathname.startsWith('/product/')) return null;

  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;
  const isHome = location.pathname === '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] w-full pointer-events-none transition-all duration-500">
      {/* Top Bar for Logo */}
      {!isNative && (
        <div className={cn(
          "w-full px-6 py-4 flex items-center justify-start transition-all duration-700 relative overflow-hidden",
          scrolled 
            ? "translate-y-0 opacity-100" 
            : "translate-y-0 opacity-100",
          scrolled ? "bg-white/80 backdrop-blur-2xl border-b border-black/[0.03] shadow-[0_4px_30px_rgba(0,0,0,0.02)] py-3" : "bg-transparent"
        )}>
          {/* Crystalline Shine on scroll */}
          {scrolled && (
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 5 }}
              className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] pointer-events-none"
            />
          )}

          <div className="flex items-center pointer-events-auto">
            <Link to="/" onClick={() => triggerHaptic('light')} className="w-12 h-12 flex items-center justify-center group relative z-[110]">
              <div className="relative w-8 h-8 flex items-center justify-center">
                {/* Background Glow */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 0.4, scale: 1.2 }}
                  className="absolute inset-0 bg-[#C5A059]/30 rounded-full blur-xl transition-all duration-500"
                />
                
                {/* Main Logo */}
                <motion.div 
                  whileHover={{ 
                    scale: 1.1,
                    rotate: 360,
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ 
                    rotate: { duration: 0.4, ease: "circOut" },
                    scale: { type: "spring", stiffness: 400, damping: 15 }
                  }}
                  className="relative w-8 h-8 bg-black group-hover:bg-[#C5A059] transition-colors duration-500 overflow-hidden"
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

                {/* Subtle outer ring on hover */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="absolute -inset-1 border border-[#C5A059]/20 rounded-full pointer-events-none"
                />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Side Bar for Actions - Attached to Right Border */}
      <div className={cn(
        "fixed right-0 top-24 z-50 flex flex-col items-center gap-2 p-2 pointer-events-auto transition-all duration-700",
        "bg-white/70 backdrop-blur-2xl border-l border-y border-black/[0.03] shadow-[0_4px_30px_rgba(0,0,0,0.02)] rounded-l-[32px]",
        isNative && "top-8" // Move up if no logo
      )}>
        {/* Notifications */}
        <Link to="/notifications" onClick={() => triggerHaptic('light')} className="w-10 h-10 flex items-center justify-center relative group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-black/40 hover:bg-black hover:text-white transition-all"
          >
            <Bell className="w-4 h-4" />
          </motion.div>
        </Link>
        
        {/* Cart Bag */}
        <Link to="/cart" onClick={() => triggerHaptic('light')} className="w-10 h-10 flex items-center justify-center relative group">
          <motion.div
            ref={bagRef}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative cursor-pointer flex items-center justify-center"
          >
            <div className="relative scale-[0.6] origin-center -rotate-6">
              {/* Bag Handles */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2 z-0">
                <div className="w-5 h-7 border-[2.5px] border-[#8B7355]/40 rounded-t-lg" />
              </div>
              
              {/* Bag Body */}
              <div className={cn(
                "relative z-10 w-13 h-15 bg-[#D2B48C] border-[1px] border-[#8B7355]/30 shadow-sm flex flex-col items-center justify-center overflow-hidden transition-all duration-500 rounded-px",
                itemCount > 0 ? "bg-[#C4A484]" : "bg-[#D2B48C]"
              )}>
                {/* Logo */}
                <div 
                  className="w-[50%] h-[50%] bg-black/70"
                  style={{ 
                    WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                    maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                  }}
                />
              </div>

              {/* Badge */}
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-black min-w-[20px] h-[20px] rounded-full flex items-center justify-center border-2 border-white z-30 shadow-lg px-1"
                  >
                    {itemCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </Link>

        {/* Wishlist Action */}
        <Link to="/wishlist" onClick={() => triggerHaptic('light')} className={cn(
          "relative shrink-0 w-10 h-10 flex items-center justify-center rounded-full group transition-all duration-500",
          "bg-black/5 text-black hover:bg-black hover:text-white"
        )}>
          <Heart className={cn(
            "w-4.5 h-4.5 transition-colors"
          )} />
          {wishlist.length > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[6px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {wishlist.length}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
});

export default Navbar;

