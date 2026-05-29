import React, { useRef, useState, memo, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Plus, Play, Trash2, Share2, Crown, Star, Sparkles, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
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

import { triggerHaptic } from '@/lib/haptics';

const ProductCard = memo(({ id, name, price, originalPrice, image, images = [], category, isNew, isUpcoming, isTribeExclusive, tribeReleaseDate, discount, sizes = ['S', 'M', 'L', 'XL'], videoUrl, videoUrls = [], priority, aspectRatio = 'portrait', variant = 'default', ...props }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, userData, role, isNative } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [5, 0, -5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1, 0.98]);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [animationStartPos, setAnimationStartPos] = useState<{ x: number, y: number } | undefined>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fetchedMedia, setFetchedMedia] = useState<any[]>([]);
  const [isInView, setIsInView] = useState(false);

  const deliveryText = useMemo(() => {
    const today = new Date();
    const daysToAdd = props.deliveryDays || (id.charCodeAt(0) % 3) + 2; 
    const deliveryDate = new Date();
    deliveryDate.setDate(today.getDate() + daysToAdd);
    const day = deliveryDate.getDate();
    const month = deliveryDate.toLocaleString('en-IN', { month: 'short' });
    const weekday = deliveryDate.toLocaleString('en-IN', { weekday: 'short' });
    return `Express Delivery by ${weekday}, ${day} ${month}`;
  }, [id, props.deliveryDays]);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && id) {
      const fetchMediaSub = async () => {
        try {
          const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
          
          // Fetch media subcollection
          const mediaQuery = query(collection(db, 'products', id, 'media'), orderBy('createdAt', 'asc'));
          const mediaSnap = await getDocs(mediaQuery);
          const mediaList = mediaSnap.empty ? [] : mediaSnap.docs.map(d => d.data());

          // Fetch gallery subcollection
          let galleryList: any[] = [];
          try {
            const galleryQuery = query(collection(db, 'products', id, 'gallery'), orderBy('createdAt', 'asc'));
            const gallerySnap = await getDocs(galleryQuery);
            galleryList = gallerySnap.empty ? [] : gallerySnap.docs.map(d => d.data());
          } catch (gErr) {
            console.warn("Could not fetch gallery for product", id, gErr);
          }

          // Merge both media and gallery
          const combined = [...mediaList, ...galleryList];
          const seenUrls = new Set<string>();
          const deduped: any[] = [];
          for (const item of combined) {
            if (item && item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              deduped.push(item);
            }
          }

          if (deduped.length > 0) {
            setFetchedMedia(deduped);
          }
        } catch (error) {
          console.error("Error fetching media sub-collection:", error);
        }
      };
      fetchMediaSub();
    }
  }, [id, isInView]);

  const displayMedia = useMemo(() => {
    const combinedList: { type: 'video' | 'youtube' | 'image'; url: string }[] = [];
    const seenUrls = new Set<string>();

    // 1. Add props.media if present
    if (props.media && Array.isArray(props.media)) {
      props.media.forEach((m: any) => {
        if (m && m.url) {
          const youtubeUrl = m.type === 'video' ? getYoutubeEmbedUrl(m.url) : null;
          const type = youtubeUrl ? 'youtube' : m.type;
          const url = youtubeUrl || m.url;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            combinedList.push({ type, url });
          }
        }
      });
    }

    // 2. Add fetchedMedia
    if (fetchedMedia && Array.isArray(fetchedMedia)) {
      fetchedMedia.forEach((m: any) => {
        if (m && m.url) {
          const youtubeUrl = m.type === 'video' ? getYoutubeEmbedUrl(m.url) : null;
          const type = youtubeUrl ? 'youtube' : m.type;
          const url = youtubeUrl || m.url;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            combinedList.push({ type, url });
          }
        }
      });
    }

    // 3. Add videoUrls / videoUrl
    const vUrls = (videoUrls && videoUrls.length > 0) ? videoUrls : (videoUrl ? [videoUrl] : []);
    vUrls.forEach(url => {
      if (url && typeof url === 'string') {
        const youtubeUrl = getYoutubeEmbedUrl(url);
        const type = youtubeUrl ? 'youtube' : 'video';
        const finalUrl = youtubeUrl || url;
        if (!seenUrls.has(finalUrl)) {
          seenUrls.add(finalUrl);
          combinedList.push({ type, url: finalUrl });
        }
      }
    });

    // 4. Add images / image prop
    const imgs = (images && images.length > 0) ? images : (image ? [image] : []);
    imgs.forEach(url => {
      if (url && typeof url === 'string' && !seenUrls.has(url)) {
        seenUrls.add(url);
        combinedList.push({ type: 'image', url });
      }
    });

    // Fallback if empty
    if (combinedList.length === 0) {
      combinedList.push({ type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80' });
    }

    return combinedList;
  }, [props.media, fetchedMedia, videoUrls, videoUrl, images, image]);

  useEffect(() => {
    if (displayMedia.length <= 1) return;
  }, [currentImageIndex, displayMedia.length]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasInWishlist = isInWishlist(id);
    triggerHaptic(wasInWishlist ? 'light' : 'success');
    toggleWishlist({ id, name, price, image, images } as any);
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
    triggerHaptic('medium');
    
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

  const handleTryOn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('medium');
    
    // Navigate to trial room with product context
    navigate('/trial-room', { state: { tryOnProduct: { id, name, price, image, description: props.description } } });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== currentImageIndex) {
      setCurrentImageIndex(newIndex);
    }
  };

  const scrollPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollBy({ left: -width, behavior: 'smooth' });
    }
  };

  const scrollNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollBy({ left: width, behavior: 'smooth' });
    }
  };

  if (isDeleting) return null;

  return (
    <motion.div 
      ref={cardRef}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex flex-col h-full transition-all border-r-[0.5px] border-b-[0.5px] border-[#e5e5e5]",
        variant === 'default' ? "bg-white" : "bg-transparent"
      )}
    >
      {/* Image Container */}
      <div className={cn(
        "relative overflow-hidden block shimmer-primary",
        variant === 'default' ? "bg-transparent" : "bg-transparent mb-3",
        aspectRatio === 'square' ? "aspect-square" : "aspect-[2/3] sm:aspect-[3/4]"
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
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  loading={priority && idx === 0 ? "eager" : "lazy"}
                  {...(priority && idx === 0 ? { fetchPriority: "high" } : {})}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80";
                  }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Left/Right navigation chevrons */}
        {displayMedia.length > 1 && (
          <>
            <button 
              onClick={scrollPrev}
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/75 hover:bg-white text-black rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 z-20 md:flex hidden opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={3} />
            </button>
            <button 
              onClick={scrollNext}
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/75 hover:bg-white text-black rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 z-20 md:flex hidden opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={3} />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {displayMedia.length > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {displayMedia.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-1 h-1 rounded-full transition-all duration-300",
                    currentImageIndex === idx ? "bg-white w-3" : "bg-white/40"
                  )} 
                />
              ))}
            </div>
          </>
        )}

        {/* Myntra Rating Overlay on Image Bottom-Left */}
        {props.averageRating > 0 && (
          <div className="absolute bottom-2 left-2 z-20 bg-white/95 backdrop-blur-sm text-[8px] font-black text-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm border border-black/5">
            <span>{props.averageRating.toFixed(1)}</span>
            <Star className="w-2 h-2 fill-black text-black" />
            <span className="text-black/30 text-[7px] border-l border-black/10 pl-1 ml-0.5">
              {props.reviewCount || ((id.charCodeAt(0) % 40) + 12)}
            </span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount && (
            <div className="bg-white text-black font-bold text-[7px] px-2 py-0.5 rounded-none uppercase tracking-[0.1em] border border-black/5">
              -{discount}%
            </div>
          )}
        </div>

        {/* Admin Delete Button */}
        {isAdmin && (
          <button 
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full transition-all shadow-lg z-20 hover:bg-red-600 opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}

        {/* Quick Add Button - Always visible */}
        {!isUpcoming && (
          <div className="absolute bottom-2 right-2 z-20 transition-opacity">
            <Button 
              onClick={handleQuickAdd}
              size="icon" 
              className="w-8 h-8 bg-black/80 backdrop-blur-sm text-white rounded-full hover:bg-black transition-all border-none shadow-md"
            >
              <Plus className="h-4 w-4" />
            </Button>
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
        "flex flex-col p-2.5 sm:p-3.5 bg-white flex-grow justify-between gap-1",
        variant !== 'default' && "bg-transparent px-1"
      )}>
        <div className="space-y-0.5">
          {/* Brand Name */}
          {props.brand && (
            <div className="text-[7.5px] font-black uppercase tracking-[0.2em] text-[#C5A059]">
              {props.brand}
            </div>
          )}

          {/* Product Title / Link */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/product/${id}`} className="flex-grow">
              <h3 className="font-bold text-black text-[9.5px] sm:text-[10px] leading-tight uppercase tracking-wider line-clamp-1">
                {name}
              </h3>
            </Link>
            <button 
              onClick={handleWishlistToggle}
              className="flex-shrink-0 text-black/40 hover:text-black transition-colors"
            >
              <Heart className={cn("h-4 w-4", isInWishlist(id) && "fill-black text-black")} />
            </button>
          </div>

          {/* Short Description */}
          {props.description && (
            <p className="text-[8px] sm:text-[8.5px] text-black/45 line-clamp-1 font-medium italic">
              {props.description}
            </p>
          )}
        </div>
        
        <div className="space-y-1.5 mt-1">
          {/* Price Tag with original and discount percent indicator */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="font-black text-black text-sm sm:text-[14.5px]">₹{price}</span>
            {originalPrice && (
              <>
                <span className="text-[10px] sm:text-[11px] text-neutral-400 line-through font-normal">₹{originalPrice}</span>
                {discount && (
                  <span className="text-[8px] font-black bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {discount}% OFF
                  </span>
                )}
              </>
            )}
            {props.badge && props.badge.toLowerCase().trim() !== "new collection" && (
              <span className="text-[7px] font-black text-[#C5A059] uppercase tracking-wider ml-auto">
                {props.badge}
              </span>
            )}
          </div>



        </div>
      </div>
    </motion.div>
  );
});

export default ProductCard;
