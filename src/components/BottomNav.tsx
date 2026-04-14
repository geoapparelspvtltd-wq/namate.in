import { Link, useLocation } from 'react-router-dom';
import { Crown, LayoutGrid, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import RegalDiamond from './RegalDiamond';
import { memo } from 'react';

const BottomNav = memo(() => {
  const location = useLocation();

  // Hide bottom nav in reel mode (ProductDetail)
  if (location.pathname.startsWith('/product/')) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md isolate">
      <div className="bg-white/80 backdrop-blur-3xl border border-black/5 rounded-full p-2.5 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
        {/* Logo / Home */}
        <Link 
          to="/" 
          className={cn(
            "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-500",
            location.pathname === '/' ? "bg-black scale-110 shadow-[0_10px_30px_rgba(0,0,0,0.2)]" : "text-black hover:bg-black/5"
          )}
        >
          <div 
            className={cn(
              "w-8 h-8 transition-all duration-500",
              location.pathname === '/' ? "bg-white" : "bg-black"
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

        {/* Categories */}
        <Link 
          to="/shop" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-500",
            location.pathname === '/shop' ? "bg-black text-white scale-110 shadow-[0_0_20px_rgba(0,0,0,0.1)]" : "text-black/40 hover:text-black hover:bg-black/5"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
        </Link>

        {/* Namate Regal (Middle Position) */}
        <Link 
          to="/regal" 
          className={cn(
            "flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-500 -mt-2",
            location.pathname === '/regal' ? "bg-black text-white scale-110 shadow-[0_0_30px_rgba(0,0,0,0.2)]" : "text-black hover:bg-black/5"
          )}
        >
          <RegalDiamond size={44} />
        </Link>

        {/* Sale */}
        <Link 
          to="/sale" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-500",
            location.pathname === '/sale' ? "bg-black text-white scale-110 shadow-[0_0_30px_rgba(0,0,0,0.2)]" : "bg-black/5 text-black/40 hover:text-black hover:bg-black/10"
          )}
        >
          <span className="text-[8px] font-brand font-medium uppercase tracking-[0.4em]">SALE</span>
        </Link>

        {/* Profile */}
        <Link 
          to="/profile" 
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-500",
            location.pathname === '/profile' ? "bg-black text-white scale-110 shadow-[0_0_20px_rgba(0,0,0,0.1)]" : "text-black/40 hover:text-black hover:bg-black/5"
          )}
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
});

export default BottomNav;
