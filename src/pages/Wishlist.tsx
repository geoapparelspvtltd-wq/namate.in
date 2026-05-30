import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingBag, Trash2, Heart, Sparkles, TrendingDown, Clock, ArrowRight, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/lib/WishlistContext';
import { useCart } from '@/lib/CartContext';
import BrandSignature from '@/components/BrandSignature';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [movingId, setMovingId] = useState<string | null>(null);

  const calculateTotalSavings = () => {
    return wishlist.reduce((acc, item) => {
      const original = item.originalPrice || (item.price * 1.35);
      const savings = original - item.price;
      return acc + Math.round(savings);
    }, 0);
  };

  const calculateTotalValue = () => {
    return wishlist.reduce((acc, item) => acc + item.price, 0);
  };

  const handleMoveToCart = async (product: any) => {
    triggerHaptic('success');
    setMovingId(product.id);
    
    setTimeout(() => {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || (product.images && product.images[0]),
        images: product.images || [product.image],
        category: product.category
      } as any, 'M'); // Default size M for prompt conversion
      
      removeFromWishlist(product.id);
      setMovingId(null);
      
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />
          <span>Moved <strong className="font-extrabold">{product.name}</strong> to Cart!</span>
        </div>
      );
    }, 400);
  };

  const handleMoveAllToCart = () => {
    triggerHaptic('success');
    if (wishlist.length === 0) return;
    
    wishlist.forEach(item => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        images: item.images || [item.image],
        category: item.category
      } as any, 'M');
      removeFromWishlist(item.id);
    });

    toast.success(`Successfully moved ${wishlist.length} looks to your Cart bag!`);
  };

  const handleClearAll = () => {
    triggerHaptic('heavy');
    if (confirm("Are you sure you want to clear your collection?")) {
      wishlist.forEach(item => removeFromWishlist(item.id));
      toast.info("Wishlist has been cleared.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pt-24 pb-32 animate-fade-in selection:bg-[#C5A059]/10">
      <div className="px-4 max-w-7xl mx-auto">
        
        {/* Breadcrumb & Subtitle */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => {
              triggerHaptic('light');
              navigate(-1);
            }} 
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#C5A059] hover:text-black transition-colors"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 duration-300 text-[#C5A059]" />
            <span>Back to Closet</span>
          </button>
          
          <div className="flex items-center gap-1.5 bg-black/[0.03] px-3.5 py-1.5 rounded-full border border-black/[0.03] shadow-sm">
            <span className="scale-75 inline-block w-2.5 h-2.5 rounded-full bg-[#C5A059]/80 animate-ping"></span>
            <span className="text-[8px] font-black uppercase tracking-widest text-black/55">
              {wishlist.length} Curated Looks
            </span>
          </div>
        </div>

        {/* Master Heading */}
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-black flex items-center justify-center gap-2.5">
            <Heart className="w-7 h-7 text-[#C5A059] fill-[#C5A059]" />
            Your Wishlist
          </h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] max-w-lg mx-auto">
            Review and capture your handpicked selection before items sell out.
          </p>
        </div>

        {wishlist.length === 0 ? (
          /* Empty Page state - Luxurious Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="relative w-28 h-28 bg-gradient-to-tr from-neutral-50 to-neutral-100 rounded-full flex items-center justify-center mb-8 shadow-inner border border-neutral-200/40">
              <ShoppingBag className="w-12 h-12 text-[#C5A059]/60 shrink-0" />
              <div className="absolute -top-1 -right-1 bg-white p-2 rounded-full shadow-md border border-neutral-100">
                <Sparkles className="w-5 h-5 text-[#C5A059] animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-xl font-black uppercase tracking-wider mb-2 text-black">NO STYLES CAPTURED YET</h2>
            <p className="text-neutral-500 font-medium text-xs mb-8 leading-relaxed">
              Snap high-fashion screen shots or hit the wishlist heart button while walking through our catalog. We'll secure them right here!
            </p>
            
            <Link to="/shop" className="w-full">
              <Button 
                onClick={() => triggerHaptic('light')}
                className="w-full bg-black hover:bg-neutral-900 text-[#C5A059] font-black text-xs uppercase tracking-widest py-6 rounded-full border border-[#C5A059]/30 transition-all shadow-xl hover:shadow-black/10 hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <span>Browse the Collection</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </Button>
            </Link>
            
            <div className="mt-12 opacity-40">
              <BrandSignature variant="light" className="opacity-40 scale-90" />
            </div>
          </div>
        ) : (
          /* Main Wishlist Showcase */
          <div className="space-y-8">
            
            {/* Myntra style premium discount banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-black rounded-3xl p-6 border border-[#C5A059]/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="text-center md:text-left space-y-1.5 z-10">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">
                  <TrendingDown className="w-3.5 h-3.5 animate-bounce" />
                  <span>Exclusive Saving Alert</span>
                </div>
                <h3 className="text-white text-lg font-black uppercase tracking-tight">
                  Your Wishlist Drop Value: Save <span className="text-[#C5A059] font-black">₹{calculateTotalSavings()}</span>
                </h3>
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider max-w-xl">
                  {wishlist.length} limited-run looks premium selected. Average stock tier is: <strong className="text-red-400 uppercase font-extrabold animate-pulse">Critical low (2 units left)</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto z-10 shrink-0">
                <div className="text-right text-white sm:mr-3 text-center sm:text-right">
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">Collection Value</span>
                  <span className="text-xl font-black text-white">₹{calculateTotalValue()}</span>
                </div>
                <button 
                  onClick={handleMoveAllToCart}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#C5A059] hover:bg-[#B38F48] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Move All to Bag</span>
                </button>
              </div>
            </div>

            {/* Grid display of wishlist looks */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 border-t border-[#e5e5e5] pt-6">
              <AnimatePresence mode="popLayout">
                {wishlist.map((item) => {
                  const isMoving = movingId === item.id;
                  
                  return (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="bg-white rounded-3xl border border-black/[0.04] p-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between"
                    >
                      {/* Product Card Rendering */}
                      <div className="relative flex-1">
                        <ProductCard {...(item as any)} isWishlistPage={true} />
                      </div>

                      {/* Custom, highly attractive CTA overlay specifically for Wishlist page at bottom */}
                      <div className="mt-3.5 pt-2 border-t border-black/[0.04] space-y-2">
                        <button
                          disabled={isMoving}
                          onClick={() => handleMoveToCart(item)}
                          className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            isMoving 
                              ? "bg-neutral-100 text-neutral-400" 
                              : "bg-black text-white hover:bg-[#C5A059] hover:text-black shadow-sm"
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{isMoving ? "Securing Unit..." : "Move to Bag"}</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            removeFromWishlist(item.id);
                            toast.info(`Removed "${item.name}" from your collection.`);
                          }}
                          className="w-full py-1.5 rounded-lg text-red-500/60 hover:text-red-600 hover:bg-red-50/40 text-[8.5px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-red-500/65" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {/* Elegant clear all option */}
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleClearAll}
                className="text-[9px] font-black uppercase tracking-widest text-[#C5A059]/70 hover:text-red-500 border border-[#C5A059]/20 hover:border-red-200 px-5 py-2.5 rounded-full transition-all bg-white"
              >
                Clear Entire Closet
              </button>
            </div>

            <div className="mt-16 text-center select-none">
              <BrandSignature variant="light" className="mx-auto opacity-10 scale-95" />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
