import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, ChevronLeft, Menu, ShoppingBag, X, HelpCircle, Key, Plus, FileText, Grid, Images, Layers, Settings, History } from 'lucide-react';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { memo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '@/lib/haptics';

const Navbar = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wishlist } = useWishlist();
  const { items } = useCart();
  const { user, role, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  }, [itemCount]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;

  // Determine header layout based on route
  const isHome = location.pathname === '/';
  
  // Custom headers for other routes to match mockup screens
  let headerTitle = "";
  let rightAction: React.ReactNode = null;
  const showBackBtn = !isHome;

  if (location.pathname === '/wishlist') {
    headerTitle = "WISHLIST";
  } else if (location.pathname === '/cart') {
    headerTitle = `MY BAG (${itemCount})`;
    rightAction = (
      <button 
        onClick={() => {
          triggerHaptic('light');
          // Add custom edit action or simply toggles if needed
        }} 
        className="text-[9px] font-black tracking-widest text-[#111] uppercase"
      >
        EDIT
      </button>
    );
  } else if (location.pathname === '/profile') {
    headerTitle = "PROFILE";
    rightAction = (
      <button 
        onClick={() => {
          triggerHaptic('medium');
          navigate('/my-orders');
        }} 
        className="text-black/70 hover:text-black"
        id="profile-settings-btn"
      >
        <Settings className="w-4 h-4" />
      </button>
    );
  } else if (location.pathname === '/trial-room') {
    headerTitle = "AI TRY-ON";
  } else if (location.pathname.startsWith('/product/')) {
    headerTitle = ""; // Center product title handled internally or empty
    rightAction = null;
  } else if (location.pathname === '/shop') {
    headerTitle = "EXPLORE COLLECTION";
  } else if (location.pathname === '/my-orders') {
    headerTitle = "MY ORDERS";
  } else {
    // Fallback title formatting
    const path = location.pathname.substring(1).replace('-', ' ');
    headerTitle = path ? path.toUpperCase() : "NAMATE";
  }

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 z-[100] w-full md:max-w-md lg:max-w-lg transition-all duration-300 bg-transparent border-none",
        scrolled ? "py-2.5" : "py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
          
          {/* Left Action Button */}
          <div className="w-10 flex items-center justify-start">
            {showBackBtn ? (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  navigate(-1);
                }}
                className="w-8 h-8 -ml-1 flex items-center justify-center text-black/80 hover:text-black transition-colors"
                id="header-back-btn"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setDrawerOpen(true);
                }}
                className="w-8 h-8 -ml-1 flex items-center justify-center text-black/80 hover:text-black transition-colors"
                id="header-menu-btn"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Centered Logo/Title Area */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {!isHome && (
              <span className="text-[11px] font-black tracking-[0.25em] -mr-[0.25em] text-[#111] uppercase line-clamp-1 max-w-[200px]">
                {headerTitle}
              </span>
            )}
          </div>

          {/* Right Action Button */}
          <div className="w-10 flex items-center justify-end" ref={bagRef}>
            {rightAction}
          </div>
        </div>
      </nav>

      {/* Slide-out Menu Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black z-[1000]"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-[#F7F4F0] z-[1001] shadow-2xl flex flex-col justify-between p-8"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-10">
                  <div className="flex flex-col items-start select-none">
                    <img 
                      src="https://i.postimg.cc/wTBMVB6g/Gemini-Generated-Image-22c90822c90822c9-copy.png"
                      className="w-8 h-8 object-contain mix-blend-multiply mb-1"
                      alt="Brand Logo"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[11px] font-brand font-black tracking-[0.3em] text-[#111]">
                      NAMATE
                    </span>
                    <span className="text-[7px] tracking-[0.2em] font-medium text-black/30 uppercase mt-0.5">
                      Premium Apparel
                    </span>
                  </div>
                  <button 
                    onClick={() => setDrawerOpen(false)}
                    className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-black bg-black/5 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/30 block mb-2 px-1">Shop & Craft</span>
                  
                  <Link 
                    to="/" 
                    className="flex items-center justify-between p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl transition-colors text-xs font-black uppercase tracking-wider text-black"
                  >
                    <span>Linen Home</span>
                  </Link>
                  
                  <Link 
                    to="/shop" 
                    className="flex items-center justify-between p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl transition-colors text-xs font-black uppercase tracking-wider text-black"
                  >
                    <span>Explore Products</span>
                  </Link>

                  <Link 
                    to="/trial-room" 
                    className="flex items-center justify-between p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl transition-colors text-xs font-black uppercase tracking-wider text-black"
                  >
                    <span>AI Virtual Try-On</span>
                  </Link>

                  <Link 
                    to="/tribe" 
                    className="flex items-center justify-between p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl transition-colors text-xs font-black uppercase tracking-wider text-black"
                  >
                    <span>Join the Tribe</span>
                  </Link>

                  {user && (
                    <Link 
                      to="/my-orders" 
                      className="flex items-center justify-between p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl transition-colors text-xs font-black uppercase tracking-wider text-black"
                    >
                      <span>My Orders</span>
                    </Link>
                  )}
                </div>

                {isAdmin && (
                  <div className="space-y-1.5 mt-8">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#C5A059] block mb-2 px-1">Admin Space</span>
                    
                    <Link 
                      to="/orders-dashboard" 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <FileText className="w-3.5 h-3.5 text-black/60" />
                      <span>Orders Feed</span>
                    </Link>

                    <Link 
                      to="/manage-products" 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <Grid className="w-3.5 h-3.5 text-black/60" />
                      <span>Product Registry</span>
                    </Link>

                    <Link 
                      to="/add-product" 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <Plus className="w-3.5 h-3.5 text-black/60" />
                      <span>Add New Clothes</span>
                    </Link>

                    <Link 
                      to="/manage-gallery" 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <Images className="w-3.5 h-3.5 text-black/60" />
                      <span>Configure Hero</span>
                    </Link>

                    <Link 
                      to="/manage-categories" 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 transition-colors text-[10px] font-black uppercase tracking-widest"
                    >
                      <Layers className="w-3.5 h-3.5 text-black/60" />
                      <span>Categories</span>
                    </Link>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {user ? (
                  <div className="p-4 bg-black/5 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-black/30 block mb-1">Signed In</span>
                    <span className="text-[10px] font-black tracking-tight text-black line-clamp-1 mb-3">{user.email}</span>
                    <button
                      onClick={() => {
                        logout();
                        setDrawerOpen(false);
                      }}
                      className="w-full py-2.5 bg-black hover:bg-black/80 text-[#F7F4F0] rounded-xl text-[9px] font-black uppercase tracking-widest"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/profile" 
                    className="flex items-center justify-center gap-2 p-3.5 bg-[#C5A059] text-white hover:bg-[#B08A45] rounded-2xl transition-colors text-xs font-black uppercase tracking-widest"
                  >
                    <span>Connect Profile</span>
                  </Link>
                )}

                <div className="flex items-center justify-between text-[8px] font-bold text-black/20 uppercase tracking-widest px-1">
                  <span>Namate Studio v1.5</span>
                  <span>Est. 2026</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default Navbar;
