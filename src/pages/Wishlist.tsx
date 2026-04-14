import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/lib/WishlistContext';
import { useCart } from '@/lib/CartContext';
import BrandSignature from '@/components/BrandSignature';
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
    <div className="min-h-screen bg-background pb-32">
      <div className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full bg-black/5"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </Button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-black">My Wishlist</h1>
          <div className="ml-auto bg-black text-white text-[10px] font-black px-2 py-1 rounded-full">
            {wishlist.length} ITEMS
          </div>
        </div>

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
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {wishlist.map((item) => (
                <motion.div 
                   key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex gap-4 p-4 border-2 border-black/5 rounded-[32px] bg-black/5 group"
                >
                  <Link to={`/product/${item.id}`} className="w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-black leading-tight mb-1">{item.name}</h3>
                      <p className="text-lg font-black text-black">₹{item.price}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleMoveToCart(item)}
                        className="flex-grow bg-black text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-full"
                      >
                        MOVE TO CART
                      </Button>
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromWishlist(item.id)}
                        className="w-10 h-10 rounded-full bg-black/5 text-black/20 hover:text-red-500 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
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
