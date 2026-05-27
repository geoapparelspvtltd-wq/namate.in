import { Link, useLocation } from 'react-router-dom';
import { Compass, Heart, ShoppingBag, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { motion } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { triggerHaptic } from '@/lib/haptics';

const BottomNav = memo(() => {
  const location = useLocation();
  const { items } = useCart();
  const { wishlist } = useWishlist();

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const NavLink = ({ to, children, label, isActive }: any) => (
    <Link 
      to={to} 
      onClick={() => triggerHaptic(isActive ? 'light' : 'medium')}
      className="flex flex-col items-center justify-center w-14 sm:w-16 h-12 transition-all duration-300 relative group cursor-pointer"
    >
      <div className={cn(
        "flex items-center justify-center transition-all duration-300 rounded-lg relative",
        isActive ? "text-black scale-105" : "text-black/45 hover:text-black"
      )}>
        {children}
      </div>
      {label && (
        <span className={cn(
          "text-[7px] font-black uppercase tracking-[0.2em] -mr-[0.2em] mt-1.5 transition-colors duration-300",
          isActive ? "text-black" : "text-black/35 group-hover:text-black"
        )}>
          {label}
        </span>
      )}
      {isActive && (
        <motion.div 
          layoutId="activeTabBottom"
          className="absolute -bottom-1 w-1 h-1 bg-[#111] rounded-full"
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        />
      )}
    </Link>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[120] w-full md:max-w-md lg:max-w-lg bg-[#F7F4F0]/95 backdrop-blur-md border-t border-neutral-200/50 shadow-[0_-8px_40px_rgba(0,0,0,0.02)] pb-safe">
      <div className="max-w-xl mx-auto flex items-center justify-between py-2.5 px-6 md:px-8">
        {/* Home */}
        <NavLink to="/" label="Home" isActive={location.pathname === '/'}>
          <Home className="w-4 h-4" strokeWidth={2.2} />
        </NavLink>

        {/* Explore / Shop */}
        <NavLink to="/shop" label="Explore" isActive={location.pathname === '/shop'}>
          <Compass className="w-4 h-4" strokeWidth={2.2} />
        </NavLink>

        {/* Wishlist */}
        <NavLink to="/wishlist" label="Wishlist" isActive={location.pathname === '/wishlist'}>
          <div className="relative">
            <Heart className="w-4 h-4" strokeWidth={2.2} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-black rounded-full" />
            )}
          </div>
        </NavLink>

        {/* Bag */}
        <NavLink to="/cart" label="Bag" isActive={location.pathname === '/cart'}>
          <div className="relative">
            <ShoppingBag className="w-4 h-4" strokeWidth={2.2} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-black text-[#F7F4F0] text-[6px] font-black min-w-[12px] h-[12px] rounded-full flex items-center justify-center px-0.5">
                {itemCount}
              </span>
            )}
          </div>
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" label="Profile" isActive={location.pathname === '/profile'}>
          <User className="w-4 h-4" strokeWidth={2.2} />
        </NavLink>
      </div>
    </div>
  );
});

export default BottomNav;
