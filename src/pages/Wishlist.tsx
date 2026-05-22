import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/lib/WishlistContext';
import { useCart } from '@/lib/CartContext';
import BrandSignature from '@/components/BrandSignature';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'motion/react';

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleMoveToCart = (product: any) => {
    addToCart(product, 'M'); // Default size M for quick move
    removeFromWishlist(product.id);
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-32">
      <div className="px-4 py-4 max-w-7xl mx-auto">
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-black/20" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-black">YOUR WISHLIST IS EMPTY</h2>
            <p className="text-black/40 font-medium mb-8 max-w-xs">Save items you love here and they'll be waiting for you.</p>
            <Link to="/shop">
              <Button className="bg-black text-white font-black px-8 py-6 rounded-full mb-12">
                START SHOPPING
              </Button>
            </Link>
            <BrandSignature variant="light" className="opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-[#e5e5e5]">
            <AnimatePresence mode="popLayout">
              {wishlist.map((item) => (
                <motion.div 
                   key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white"
                >
                  <ProductCard {...(item as any)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <BrandSignature variant="light" className="mb-20 opacity-20" />
      </div>
    </div>
  );
}
