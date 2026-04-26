import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/lib/WishlistContext';

interface CategoryStripProps {
  title: string;
  products: any[];
  coverImage?: string;
}

const CategoryStrip = ({ title, products, coverImage }: CategoryStripProps) => {
  if (products.length === 0) return null;

  return (
    <div className="py-10 bg-white relative overflow-hidden">
      {/* Decorative Confetti Background */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-[url('https://i.ibb.co/VMTXFvX/confetti-bg.png')] opacity-[0.03] pointer-events-none" />
      
      {/* Category Cover Image (Optional) */}
      {coverImage && (
        <div className="px-6 mb-8">
          <Link 
            to={`/shop?category=${encodeURIComponent(title)}`}
            className="block aspect-[21/9] rounded-[32px] overflow-hidden shadow-2xl shadow-black/5 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <img 
              src={coverImage} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-6 left-8 z-20">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-lg">{title}</h2>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">EXPLORE COLLECTION</p>
            </div>
          </Link>
        </div>
      )}

      <div className="px-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!coverImage && <h2 className="text-2xl font-black text-black tracking-tight">{title}</h2>}
        </div>
        <Link 
          to={`/shop?category=${encodeURIComponent(title)}`}
          className="text-[#3EBBA4] font-bold text-sm flex items-center gap-1 hover:opacity-80 transition-opacity uppercase tracking-widest"
        >
          Explore All
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-6 snap-x group">
        {products.slice(0, 8).map((product) => (
          <CategoryProductCard key={product.id} product={product} />
        ))}
        
        {/* View All Card at the end */}
        <Link 
          to={`/shop?category=${encodeURIComponent(title)}`}
          className="flex-shrink-0 w-32 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 snap-start"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <ChevronRight className="w-6 h-6 text-[#3EBBA4]" />
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">View All</span>
        </Link>
      </div>

      {/* Elegant Divider Image */}
      <div className="px-6 opacity-[0.08]">
        <img src="https://i.ibb.co/LpxmG5Z/separator.png" className="w-full h-2 object-contain" alt="separator" />
      </div>
    </div>
  );
};

const CategoryProductCard = ({ product }: { product: any }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className="flex-shrink-0 w-[190px] bg-white rounded-[20px] overflow-hidden snap-start shadow-xl shadow-black/5 flex flex-col border border-gray-100/50"
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden group-card">
        <Link to={`/product/${product.id}`} className="block h-full">
           <img 
            src={product.images?.[0] || product.image} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-card-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </Link>
        
        {/* Bestseller Badge */}
        <div className="absolute top-3 left-0 bg-[#FFF38C] text-black text-[9px] font-black px-3 py-1.5 uppercase tracking-widest rounded-r-lg shadow-sm">
          BESTSELLER
        </div>

        {/* Rating Badge */}
        {product.averageRating > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-gray-100">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
            <span className="text-[11px] font-black text-black">{product.averageRating.toFixed(1)}</span>
            <span className="text-[10px] font-bold text-black/40">({product.reviewCount})</span>
          </div>
        )}

        {/* Wishlist Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className="absolute top-3 right-3 w-10 h-10 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-black/60 hover:text-red-500 transition-all hover:bg-white"
        >
          <Heart className={cn("w-5 h-5 transition-all", isInWishlist(product.id) && "fill-current text-red-500 scale-110")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 bg-white flex-grow border-t border-gray-50">
        <Link to={`/product/${product.id}`} className="block mb-2">
          <h3 className="text-[12px] font-black text-black line-clamp-1 truncate uppercase tracking-tight">{product.name}</h3>
          <p className="text-[10px] text-gray-400 font-bold tracking-tight">Men's Comfort Essentials</p>
        </Link>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-black text-black">₹{product.price}</span>
          {product.originalPrice && (
            <span className="text-[11px] text-gray-300 line-through font-bold">₹{product.originalPrice}</span>
          )}
          {discount > 0 && (
            <span className="text-[11px] font-black text-[#3EBBA4]">{discount}% OFF</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryStrip;
