import { Link, useLocation } from 'react-router-dom';
import { Heart, Search, ChevronLeft } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { useSearch } from '@/lib/SearchContext';
import { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = memo(() => {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, role } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  
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
  const showSearch = !isHome || scrolled;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full px-4 py-6 bg-transparent transition-all duration-500">
      <div className="max-w-xl mx-auto flex items-center gap-4">
        {/* Logo-Search Hybrid Container */}
        <div className={cn(
          "flex-grow flex items-center gap-3 transition-all duration-500 border-black/5",
          showSearch ? "bg-white/70 backdrop-blur-md rounded-[24px] px-5 py-3.5 shadow-2xl shadow-black/5 border" : "bg-transparent border-none"
        )}>
          {/* Logo as the "Search Symbol" */}
          <Link to="/" className="shrink-0 group relative">
            <div 
              className={cn(
                "w-10 h-10 sm:w-8 sm:h-8 bg-black transition-all duration-500",
                isHome && !scrolled ? "scale-125" : "scale-100 group-hover:scale-110"
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
            />
          </Link>

          <AnimatePresence>
            {showSearch && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-grow flex items-center gap-4"
              >
                <input 
                  type="text" 
                  placeholder='SEARCH "DENIM"' 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-black font-black text-xs uppercase tracking-[0.2em] placeholder:text-black/20"
                />
                
                <div className="flex items-center gap-3 shrink-0">
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="p-1 hover:bg-black/5 rounded-full transition-colors"
                    >
                      <Search className="w-4 h-4 text-black/40 rotate-45" />
                    </button>
                  ) : (
                    <Search className="w-4 h-4 text-black/20" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wishlist Action */}
        <Link to="/wishlist" className={cn(
          "relative shrink-0 w-12 h-12 flex items-center justify-center rounded-full group transition-all duration-500",
          scrolled ? "bg-black text-white" : "bg-white/10 backdrop-blur-md border border-white/20 text-white"
        )}>
          <Heart className={cn(
            "w-5 h-5 transition-colors",
            scrolled ? "text-white" : "text-white sm:text-black"
          )} />
          {wishlist.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in duration-300">
              {wishlist.length}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
});

export default Navbar;
