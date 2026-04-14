import { Link, useLocation } from 'react-router-dom';
import { Search, Heart } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { memo } from 'react';

const Navbar = memo(() => {
  const location = useLocation();
  const { wishlist } = useWishlist();
  const { user, role } = useAuth();
  
  // Hide navbar in reel mode (ProductDetail)
  if (location.pathname.startsWith('/product/')) return null;

  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full overflow-hidden">
      {/* The "White Sheet" Layer */}
      <div className="absolute inset-0 bg-white opacity-90 -z-20" />
      {/* The Blur Layer */}
      <div className="absolute inset-0 backdrop-blur-xl bg-white/40 -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-black/5">
        <div className="flex justify-between items-center h-36 sm:h-48">
          {/* Left side: Logo & Navigation */}
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="hover:scale-105 transition-transform shrink-0">
                <div 
                  className="w-32 h-32 sm:w-44 sm:h-44 bg-black"
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
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:space-x-10">
              <Link to="/shop" className="group relative py-2 text-[11px] font-medium text-black/50 hover:text-black transition-colors tracking-[0.2em] uppercase">
                Men
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
              </Link>
              <Link to="/shop" className="group relative py-2 text-[11px] font-medium text-black/50 hover:text-black transition-colors tracking-[0.2em] uppercase">
                Women
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
              </Link>
              <Link to="/shop" className="group relative py-2 text-[11px] font-medium text-black/50 hover:text-black transition-colors tracking-[0.2em] uppercase">
                Accessories
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
              </Link>
              <Link to="/sale" className="group relative py-2 text-[11px] font-bold text-black hover:opacity-80 transition-opacity tracking-[0.2em] uppercase">
                Sale
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
              </Link>
              <Link to="/tribe" className="group relative py-2 text-[11px] font-bold text-black hover:opacity-80 transition-opacity tracking-[0.2em] uppercase">
                Tribe
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-black transition-all group-hover:w-full" />
              </Link>
              {isAdmin && (
                <>
                  <Link to="/orders-dashboard" className="group relative py-2 text-[11px] font-bold text-red-600 hover:opacity-80 transition-opacity tracking-[0.2em] uppercase">
                    Orders
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-red-600 transition-all group-hover:w-full" />
                  </Link>
                  <Link to="/manage-products" className="group relative py-2 text-[11px] font-bold text-red-600 hover:opacity-80 transition-opacity tracking-[0.2em] uppercase">
                    Inventory
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-red-600 transition-all group-hover:w-full" />
                  </Link>
                  <Link to="/add-product" className="group relative py-2 text-[11px] font-bold text-red-600 hover:opacity-80 transition-opacity tracking-[0.2em] uppercase">
                    Add Product
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-red-600 transition-all group-hover:w-full" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="hidden lg:flex items-center border-b border-black/10 py-1 w-64 group focus-within:border-black/30 transition-colors">
              <Search className="h-6 w-6 text-black/30 mr-3 group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH..." 
                className="bg-transparent border-none focus:ring-0 text-xs w-full outline-none font-medium tracking-[0.2em] text-black placeholder:text-black/20"
              />
            </div>
            
            <Link to="/wishlist" className="relative p-2 text-black/50 hover:text-black transition-colors group">
              <Heart className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[8px] font-black rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link to="/profile" className="sm:hidden p-2 text-red-600 hover:text-red-500 transition-colors font-black text-[10px] uppercase tracking-widest border border-red-600/30 rounded-lg">
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
});

export default Navbar;
