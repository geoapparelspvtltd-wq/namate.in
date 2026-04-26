import React, { useRef, useState, memo, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Plus, Play, Trash2, Share2, Crown, ChevronLeft, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { cn, getYoutubeEmbedUrl } from '@/lib/utils';
import QuickAddSheet from './QuickAddSheet';
import FloatingHeart from './FloatingHeart';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  isNew?: boolean;
  isUpcoming?: boolean;
  isTribeExclusive?: boolean;
  tribeReleaseDate?: string;
  badge?: string;
  discount?: number;
  sizes?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  priority?: boolean;
  aspectRatio?: 'portrait' | 'square';
  variant?: 'default' | 'minimal';
  [key: string]: any;
}

const ProductCard = memo(({ id, name, price, originalPrice, image, images = [], category, isNew, isUpcoming, isTribeExclusive, tribeReleaseDate, discount, sizes = ['S', 'M', 'L', 'XL'], videoUrl, videoUrls = [], priority, aspectRatio = 'portrait', variant = 'default', ...props }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, userData, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [animationStartPos, setAnimationStartPos] = useState<{ x: number, y: number } | undefined>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayMedia = useMemo(() => {
    // If unified media exists, use it as is (respecting user order)
    if (props.media && Array.isArray(props.media) && props.media.length > 0) {
      return props.media.map((m: any) => {
        const youtubeUrl = m.type === 'video' ? getYoutubeEmbedUrl(m.url) : null;
        return {
          type: youtubeUrl ? 'youtube' : m.type,
          url: youtubeUrl || m.url
        };
      });
    }

    const items: { type: 'video' | 'youtube' | 'image', url: string }[] = [];
    
    // Add videos
    const vUrls = videoUrls.length > 0 ? videoUrls : (videoUrl ? [videoUrl] : []);
    vUrls.forEach(url => {
      if (url && typeof url === 'string') {
        const youtubeUrl = getYoutubeEmbedUrl(url);
        if (youtubeUrl) {
          items.push({ type: 'youtube', url: youtubeUrl });
        } else {
          items.push({ type: 'video', url });
        }
      }
    });

    // Add images
    const imgs = images.length > 0 ? images : [image];
    imgs.forEach(url => {
      if (url && typeof url === 'string') {
        items.push({ type: 'image', url });
      }
    });

    if (items.length === 0) {
      items.push({ type: 'image', url: 'https://picsum.photos/seed/fashion/600/800' });
    }
    
    return items;
  }, [props.media, videoUrls, videoUrl, images, image]);

  useEffect(() => {
    if (displayMedia.length <= 1) return;
  }, [currentImageIndex, displayMedia.length]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasInWishlist = isInWishlist(id);
    toggleWishlist({ id, name, price, image });
    if (!wasInWishlist) {
      setShowFloatingHeart(true);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success("Product removed from tribe collection");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/product/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isTribeExclusive && !userData?.isTribeMember && !isAdmin) {
      toast.error("Tribe Exclusive! Join the tribe to purchase.");
      navigate('/tribe');
      return;
    }
    
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnimationStartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    setIsQuickAddOpen(true);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== currentImageIndex) {
      setCurrentImageIndex(newIndex);
    }
  };

  if (isDeleting) return null;

  return (
    <motion.div 
      ref={cardRef}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex flex-col h-full transition-all",
        variant === 'default' ? "bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100 active:bg-gray-100 hover:shadow-2xl hover:shadow-black/5" : "bg-transparent"
      )}
    >
      {/* Image Container */}
      <div className={cn(
        "relative overflow-hidden block shimmer-primary",
        variant === 'default' ? "bg-gray-100" : "bg-gray-100 rounded-[24px] mb-3",
        aspectRatio === 'square' ? "aspect-square" : "aspect-[3/4]"
      )}>
        <div 
          ref={scrollRef}
          className="flex h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
          onScroll={handleScroll}
        >
          {displayMedia.map((item, idx) => (
            <Link 
              key={idx}
              to={`/product/${id}`} 
              className="w-full h-full flex-shrink-0 snap-start relative block"
            >
              {item.type === 'youtube' ? (
                <iframe 
                  src={item.url}
                  className="w-full h-full border-none pointer-events-none"
                  allow="autoplay; encrypted-media"
                  title="YouTube video player"
                />
              ) : item.type === 'video' ? (
                <video 
                  src={item.url} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={item.url} 
                  alt={`${name} - ${idx + 1}`} 
                  className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading={priority && idx === 0 ? "eager" : "lazy"}
                  {...(priority && idx === 0 ? { fetchPriority: "high" } : {})}
                />
              )}
            </Link>
          ))}
        </div>
        
        {/* Pagination Dots */}
        {displayMedia.length > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {displayMedia.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    currentImageIndex === idx ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/40"
                  )} 
                />
              ))}
            </div>
            
            {/* Manual Navigation Arrows */}
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const prevIndex = (currentImageIndex - 1 + displayMedia.length) % displayMedia.length;
                scrollRef.current?.scrollTo({ left: prevIndex * scrollRef.current.offsetWidth, behavior: 'smooth' });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const nextIndex = (currentImageIndex + 1) % displayMedia.length;
                scrollRef.current?.scrollTo({ left: nextIndex * scrollRef.current.offsetWidth, behavior: 'smooth' });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {props.badge && (
            <div className="bg-black text-white font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-white/5">
              {props.badge}
            </div>
          )}
          {discount && (
            <div className="bg-white/10 backdrop-blur-md text-white font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-white/10 shadow-sm">
              -{discount}%
            </div>
          )}
          {(videoUrl || videoUrls.length > 0) && (
            <div className="bg-white text-black font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-sm flex items-center gap-1 border border-black/5">
              <Play className="w-2 h-2 fill-current" />
              Video
            </div>
          )}
          {props.isPremium && (
            <div className="bg-black text-white font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg flex items-center gap-1 border border-white/10">
              <Crown className="w-2 h-2 fill-current text-white" />
              Regal
            </div>
          )}
          {isUpcoming && (
            <div className="bg-white/90 backdrop-blur-md text-black font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-black/10 shadow-sm flex items-center gap-1">
              <Play className="w-2 h-2 fill-current rotate-90" />
              Upcoming
            </div>
          )}
          {isTribeExclusive && (
            <div className="bg-[#C5A059] text-white font-bold text-[8px] px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg flex items-center gap-1 border border-white/10">
              <Sparkles className="w-2 h-2 fill-current text-white" />
              Tribe
            </div>
          )}
        </div>

        {/* Admin Delete Button */}
        {isAdmin && (
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={handleDelete}
            className="absolute top-4 left-1/2 -translate-x-1/2 p-2.5 bg-red-500/80 backdrop-blur-md text-white rounded-full transition-all shadow-lg z-20 hover:bg-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        )}

        {/* Wishlist Button */}
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={handleWishlistToggle}
          className={cn(
            "absolute top-4 right-4 p-2.5 backdrop-blur-md rounded-full transition-all shadow-sm z-20",
            isInWishlist(id) 
              ? "bg-white text-black" 
              : "bg-white/10 text-white/40 hover:text-white"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isInWishlist(id) ? 'active' : 'inactive'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Heart className={cn("h-4 w-4", isInWishlist(id) && "fill-current")} />
            </motion.div>
          </AnimatePresence>
          
          {/* Sparkle Effect on Activation */}
          {isInWishlist(id) && (
            <motion.div 
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-black rounded-full -z-10"
            />
          )}
        </motion.button>

        {/* Quick Add Button - Mobile Friendly */}
        {!isUpcoming && (
          <div className="absolute bottom-4 right-4 sm:translate-y-12 sm:group-hover:translate-y-0 transition-transform duration-500">
            <Button 
              onClick={handleQuickAdd}
              size="icon" 
              className="w-12 h-12 bg-black text-white rounded-full hover:bg-[#C5A059] transition-all shadow-xl border-none active:scale-90"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
        
        {isUpcoming && (
          <div className="absolute bottom-4 right-4 sm:translate-y-12 sm:group-hover:translate-y-0 transition-transform duration-500">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center border border-white/20">
              <Plus className="h-6 w-6 opacity-40 mx-auto" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Sheet */}
      <QuickAddSheet 
        isOpen={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        product={{ id, name, price, image, sizes }}
        startPos={animationStartPos}
      />

      <FloatingHeart 
        isVisible={showFloatingHeart} 
        onComplete={() => setShowFloatingHeart(false)} 
      />

      {/* Content */}
      <div className={cn(
        "flex flex-col flex-grow",
        variant === 'default' ? "p-3 sm:p-4" : "px-1"
      )}>
        <Link to={`/product/${id}`} className="block mb-1">
          <h3 className={cn(
            "font-bold text-black truncate transition-all",
            variant === 'default' ? "text-xs sm:text-sm" : "text-sm sm:text-base"
          )}>
            {name}
          </h3>
        </Link>
        
        {/* Rating Display */}
        {props.averageRating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={cn(
                    "w-2.5 h-2.5",
                    star <= Math.round(props.averageRating) ? "fill-black text-black" : "text-black/10"
                  )} 
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-black/40">({props.reviewCount})</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-black text-black tracking-tight",
              variant === 'default' ? "text-sm sm:text-base" : "text-base sm:text-lg"
            )}>₹{price}</span>
            {originalPrice && (
              <span className="text-[10px] text-black/20 line-through font-medium">₹{originalPrice}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
