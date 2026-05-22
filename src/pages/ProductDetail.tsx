import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, Truck, RotateCcw, ShieldCheck, Star, ChevronLeft, ChevronRight, Share2, Play, Volume2, VolumeX, ChevronUp, ChevronDown, Eye, X, MessageSquare, Sparkles, LayoutGrid, Layers, Filter, ArrowRight, Trash2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from '@/components/ProductCard';
import BrandSignature from '@/components/BrandSignature';
import FloatingHeart from '@/components/FloatingHeart';
import FloatingBag from '@/components/FloatingBag';
import ProductReviews from '@/components/ProductReviews';
import Cart from './Cart';
import { cn, getYoutubeEmbedUrl } from '@/lib/utils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useEffect } from 'react';

import { triggerHaptic } from '@/lib/haptics';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

function ReelItem({ 
  product, 
  isMuted, 
  setIsMuted, 
  isInWishlist, 
  toggleWishlist, 
  setShowFloatingHeart, 
  handleShare, 
  handleAddToCart, 
  selectedSize, 
  setSelectedSize,
  index,
  userData,
  isAdmin
}: { 
  product: any; 
  isMuted: boolean; 
  setIsMuted: (val: boolean) => void;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (p: any) => void;
  setShowFloatingHeart: (val: boolean) => void;
  handleShare: (p: any) => void;
  handleAddToCart: (p: any) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  index: number;
  userData: any;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [galleryMedia, setGalleryMedia] = useState<{id: string, url: string}[]>([]);
  const [reelMedia, setReelMedia] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const gallerySnap = await getDocs(query(collection(db, 'products', product.id, 'gallery'), orderBy('createdAt', 'asc')));
        setGalleryMedia(gallerySnap.docs.map(d => ({ id: d.id, url: d.data().url })));
      } catch (error) {
        console.error("Error fetching gallery in reel:", error);
      }
    };
    const fetchReelMedia = async () => {
      // If product already has media (legacy or small payload), don't fetch
      if (product.media && product.media.length > 0) return;
      
      try {
        const mediaSnap = await getDocs(query(collection(db, 'products', product.id, 'media'), orderBy('createdAt', 'asc')));
        if (!mediaSnap.empty) {
          setReelMedia(mediaSnap.docs.map(d => d.data()));
        }
      } catch (error) {
        console.error("Error fetching reel media in reel:", error);
      }
    };
    const fetchReviewCount = async () => {
      try {
        const reviewsSnap = await getDocs(collection(db, 'products', product.id, 'reviews'));
        setReviewCount(reviewsSnap.size);
      } catch (error) {
        console.error("Error fetching review count:", error);
      }
    };
    fetchGallery();
    fetchReelMedia();
    fetchReviewCount();
  }, [product.id]);

  const media = useMemo(() => {
    const sourceMedia = reelMedia.length > 0 ? reelMedia : (product.media || []);
    
    // If unified media exists, use it as is (respecting user order)
    if (sourceMedia && Array.isArray(sourceMedia) && sourceMedia.length > 0) {
      return sourceMedia.map((m: any) => {
        const youtubeUrl = m.type === 'video' ? getYoutubeEmbedUrl(m.url) : null;
        return {
          type: youtubeUrl ? 'youtube' : m.type,
          url: youtubeUrl || m.url
        };
      });
    }

    const items: { type: 'video' | 'youtube' | 'image', url: string }[] = [];
    
    // Add videos first
    const videoUrls = product.videoUrls || (product.videoUrl ? [product.videoUrl] : []);
    videoUrls.forEach((url: string) => {
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
    const images = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      images.push(...product.images.filter((img: any) => typeof img === 'string' && img.length > 0));
    }
    if (images.length === 0 && typeof product.image === 'string' && product.image.length > 0) {
      images.push(product.image);
    }
    
    images.forEach((url: string) => {
      items.push({ type: 'image', url });
    });

    if (items.length === 0) {
      items.push({ type: 'image', url: 'https://picsum.photos/seed/fashion/600/800' });
    }
    
    return items;
  }, [product, reelMedia]);

  useEffect(() => {
    const currentItem = media[currentMediaIndex];
    if (!currentItem || currentItem.type === 'video' || media.length <= 1 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % media.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [media, currentMediaIndex, isAutoPlaying]);

  const horizontalScrollRef = useRef<HTMLDivElement>(null);

  const nextMedia = () => {
    setIsAutoPlaying(false);
    triggerHaptic('light');
    if (horizontalScrollRef.current) {
      const { scrollLeft, offsetWidth } = horizontalScrollRef.current;
      horizontalScrollRef.current.scrollTo({
        left: scrollLeft + offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const prevMedia = () => {
    setIsAutoPlaying(false);
    triggerHaptic('light');
    if (horizontalScrollRef.current) {
      const { scrollLeft, offsetWidth } = horizontalScrollRef.current;
      horizontalScrollRef.current.scrollTo({
        left: scrollLeft - offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const currentMedia = media[currentMediaIndex];

  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const bagRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (bagRef.current) {
      const rect = bagRef.current.getBoundingClientRect();
      const pos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      window.dispatchEvent(new CustomEvent('cart-bag-pos', { detail: pos }));
    }
  }, [showCart]);

  const handleDoubleTapLike = () => {
    const wasInWishlist = isInWishlist(product.id);
    triggerHaptic(wasInWishlist ? 'light' : 'success');
    toggleWishlist({ 
      id: product.id, 
      name: product.name, 
      price: product.price, 
      image: product.image || (product.images && product.images[0]) 
    });
    if (!wasInWishlist) {
      setShowFloatingHeart(true);
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    }
  };

  const handleTryOn = () => {
    triggerHaptic('medium');
    navigate('/trial-room', { 
      state: { 
        tryOnProduct: { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          image: product.image || (product.images && product.images[0]),
          description: product.description 
        } 
      } 
    });
  };

  const handleDeleteGalleryImage = async (imgId: string) => {
    if (!window.confirm("Delete this gallery photo?")) return;
    try {
      await deleteDoc(doc(db, 'products', product.id, 'gallery', imgId));
      setGalleryMedia(prev => prev.filter(img => img.id !== imgId));
      toast.success("Gallery photo deleted");
    } catch (error) {
      console.error("Error deleting gallery photo:", error);
      toast.error("Failed to delete gallery photo");
    }
  };

  return (
    <div className="h-full w-full snap-start relative flex flex-col bg-black overflow-hidden group">
      {/* Media Background */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="relative w-full h-full">
          {/* Try On Button Over Image */}
          <div className="absolute top-24 left-6 z-20">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleTryOn}
              className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white shadow-2xl"
            >
              <Wand2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Magic Try-On</span>
            </motion.button>
          </div>

          {/* Heart Overlay Animation */}
          <AnimatePresence>
            {showHeartOverlay && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 1.2, 1], opacity: [0, 1, 1, 0] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.8, times: [0, 0.2, 0.4, 0.8] }}
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
              >
                <div className="relative">
                  <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
                  <motion.div 
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    className="absolute inset-0 bg-white rounded-full blur-xl"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full h-full overflow-hidden">
            <div 
              ref={horizontalScrollRef}
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
              onScroll={(e) => {
                const scrollLeft = e.currentTarget.scrollLeft;
                const width = e.currentTarget.offsetWidth;
                const newIndex = Math.round(scrollLeft / width);
                if (newIndex !== currentMediaIndex) {
                  setCurrentMediaIndex(newIndex);
                }
              }}
            >
              {media.map((item, idx) => (
                <div 
                  key={`${idx}-${item.url}`} 
                  className="w-full h-full flex-shrink-0 snap-start relative"
                  onClick={(e) => {
                    if (e.detail === 2) {
                      handleDoubleTapLike();
                    }
                  }}
                >
                  {item.type === 'youtube' ? (
                    <div className="w-full h-full">
                      <iframe 
                        src={item.url + (isMuted ? "" : "&mute=0")}
                        className="w-full h-full border-none"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title="YouTube video player"
                      />
                    </div>
                  ) : item.type === 'video' ? (
                    <video 
                      src={item.url} 
                      autoPlay 
                      loop 
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={item.url} 
                      alt={product.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      loading={index === 0 && idx === 0 ? "eager" : "lazy"}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== 'https://picsum.photos/seed/fashion/600/800') {
                          target.src = 'https://picsum.photos/seed/fashion/600/800';
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tap areas for navigation and interaction are now on the media items */}


          {/* Pagination Dots */}
          {media.length > 1 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {media.map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    currentMediaIndex === idx ? "bg-white w-6" : "bg-white/30 w-2"
                  )} 
                />
              ))}
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Interaction Sidebar (Shorts Style) */}
      <div className="absolute right-4 bottom-32 z-30 flex flex-col gap-5 items-center">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={handleDoubleTapLike}
          className="flex flex-col items-center gap-1"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10",
            isInWishlist(product.id) ? "bg-black text-white" : "bg-black/40 text-white"
          )}>
            <Heart className={cn("w-6 h-6", isInWishlist(product.id) && "fill-current")} />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Like</span>
        </motion.button>

        <button 
          onClick={() => {
            triggerHaptic('medium');
            handleShare(product);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Share</span>
        </button>

        <button 
          onClick={() => {
            triggerHaptic('light');
            setShowReviews(true);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">{reviewCount || 'Reviews'}</span>
        </button>

        {galleryMedia.length > 0 && (
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={() => {
              triggerHaptic('medium');
              setShowGallery(true);
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Explore</span>
          </motion.button>
        )}

        {media.some(m => m.type === 'video' || m.type === 'youtube') && (
          <button 
            onClick={() => {
              triggerHaptic('light');
              setIsMuted(!isMuted);
            }}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        )}

        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={handleTryOn}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-[#C5A059]/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[0_0_20px_rgba(197,160,89,0.3)]">
            <Wand2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest drop-shadow-md">Try On</span>
        </motion.button>
      </div>

      {/* Luxury Bag at Top Right for consistent feel */}
      <div className="absolute top-6 right-6 z-40">
        <motion.button 
          ref={bagRef}
          whileTap={{ scale: 0.8 }}
          onClick={() => {
            triggerHaptic('medium');
            setShowCart(true);
          }}
          className="relative group cursor-pointer"
        >
          <div className="relative scale-65 origin-right -rotate-6">
            {/* Bag Handles - Kraft cord look */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2 z-0">
              <div className="w-5 h-7 border-[2.5px] border-[#8B7355]/60 rounded-t-lg shadow-inner" />
            </div>
            
            {/* Bag Body - Kraft cardboard design */}
            <div className={cn(
              "relative z-10 w-12 h-14 bg-[#D2B48C] border border-[#8B7355]/40 shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500 rounded-px",
            )}>
              {/* Kraft Texture Overlay */}
              <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')]" />

              {/* Fold detail */}
              <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-black/10" />

              <div 
                className="w-[50%] h-[50%] bg-black/80 transition-transform duration-700 group-hover:scale-110"
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
            </div>

            {/* Side Tag */}
            <div className="absolute -left-0.5 bottom-3 w-2 h-3 bg-[#8B7355] rounded-sm transform -rotate-12 shadow-md z-20" />
          </div>
        </motion.button>
      </div>

      {/* Product Info Overlay */}
      <div className="mt-auto relative z-20 p-4 pb-6 bg-gradient-to-t from-black via-black/40 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge className="bg-white text-black border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
            {product.category}
          </Badge>
          {product.badge && (
            <Badge className="bg-white/20 text-white border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
              {product.badge}
            </Badge>
          )}
        </div>

        <h2 className="text-base font-black text-white uppercase tracking-tighter leading-none mb-1">
          {product.name}
        </h2>

        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-white">₹{product.price}</span>
            {product.originalPrice && (
              <span className="text-[9px] text-white/40 line-through font-bold">₹{product.originalPrice}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[8px] font-black text-[#C5A059] uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              {(product.price * 10).toLocaleString()} Coins
            </p>
            {userData && (
              <div className="h-3 w-[1px] bg-white/10" />
            )}
            {userData && (
              <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
                You have {(userData.namatePoints || 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Compact Description */}
        <p className="text-white/60 text-[8px] font-medium line-clamp-1 mb-2 max-w-[85%]">
          {product.description}
        </p>

        {/* Size Selector */}
        {product.sizes?.length > 0 && (
          <div className="mb-3">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {product.sizes.map((size: string) => (
                <button 
                  key={size}
                  onClick={() => {
                    setSelectedSize(size);
                    triggerHaptic('light');
                  }}
                  className={cn(
                    "w-7 h-7 rounded-none border font-black text-[9px] transition-all flex-shrink-0",
                    selectedSize === size 
                      ? "bg-white border-white text-black" 
                      : "border-white/10 text-white/60 hover:border-white/30"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {product.isUpcoming ? (
          <Button 
            disabled
            className="w-full h-10 bg-white/20 text-white font-black text-[10px] rounded-none border border-white/10 transition-all opacity-50"
          >
            COMING SOON
          </Button>
        ) : product.isTribeExclusive && !userData?.isTribeMember && !isAdmin ? (
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/tribe')}
              className="w-full h-10 bg-[#C5A059] text-white font-black text-[10px] rounded-none hover:bg-[#B59049] transition-all shadow-2xl active:scale-[0.98]"
            >
              JOIN THE TRIBE FOR ACCESS
            </Button>
            <p className="text-[7px] font-black text-[#C5A059] uppercase tracking-[0.2em] text-center">
              Exclusive for tribe members only
            </p>
          </div>
        ) : (
          <Button 
            onClick={() => {
              handleAddToCart(product);
            }}
            className="w-full h-10 bg-white text-black font-black text-[10px] rounded-none hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98]"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-2" />
            ADD TO CART
          </Button>
        )}
      </div>

      {/* Gallery Overlay */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col pt-20"
          >
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowGallery(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar px-4 pb-20">
              <div className="flex flex-col items-center gap-6">
                <div className="text-center mb-4">
                  <h3 className="text-white font-black uppercase tracking-tighter text-xl">Details Gallery</h3>
                  <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Explore the {product.name} story</p>
                </div>

                <div className="w-full grid grid-cols-1 gap-4">
                  {galleryMedia.map((m, i) => (
                    <motion.div 
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-full rounded-none overflow-hidden border border-white/10 shadow-2xl relative group/gallery"
                    >
                      <img 
                        src={m.url} 
                        alt={`Gallery ${i}`} 
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isAdmin && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDeleteGalleryImage(m.id)}
                            className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="py-12 flex flex-col items-center">
                  <BrandSignature variant="light" className="opacity-20 scale-75" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Overlay */}
      <AnimatePresence>
        {showReviews && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[100] bg-white flex flex-col pt-20"
          >
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => setShowReviews(false)}
                className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all shadow-xl active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pb-20">
              <ProductReviews productId={product.id} productName={product.name} />
              
              <div className="py-12 flex flex-col items-center bg-black/[0.02]">
                <BrandSignature variant="dark" className="opacity-10 scale-75" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Overlay */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[100] bg-white flex flex-col pt-20"
          >
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowCart(false);
                }}
                className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all shadow-xl active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pb-20">
              <Cart />
              
              <div className="py-12 flex flex-col items-center bg-black/[0.02]">
                <BrandSignature variant="dark" className="opacity-10 scale-75" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, userData, role, awardPoints } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentSubcategory, setCurrentSubcategory] = useState<string | null>(null);
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSharing = useRef(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCurrentAndReelProducts = async () => {
      setLoading(true);
      try {
        // 1. Fetch the specific product first
        const productRef = doc(db, 'products', id!);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          toast.error("Product not found");
          navigate('/shop');
          return;
        }

        const currentProduct = { id: productSnap.id, ...productSnap.data() } as any;
        setCurrentCategory(currentProduct.category || null);
        setCurrentSubcategory(currentProduct.subcategory || null);
        
        // 2. Fetch products with same subcategory (if exists)
        let contextProducts: any[] = [];
        if (currentProduct.subcategory) {
          const subcatQ = query(
            collection(db, 'products'), 
            where('subcategory', '==', currentProduct.subcategory),
            limit(15)
          );
          const subcatSnap = await getDocs(subcatQ);
          contextProducts = subcatSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== currentProduct.id);
        }

        // 3. Fetch products with same category (if not enough subcat products)
        if (contextProducts.length < 10 && currentProduct.category) {
          const catQ = query(
            collection(db, 'products'), 
            where('category', '==', currentProduct.category),
            limit(15)
          );
          const catSnap = await getDocs(catQ);
          const catProducts = catSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => !contextProducts.find(cp => cp.id === p.id) && p.id !== currentProduct.id);
          
          contextProducts = [...contextProducts, ...catProducts];
        }

        // 4. Fetch general products to fill the reel
        const generalQ = query(collection(db, 'products'), limit(30));
        const generalSnap = await getDocs(generalQ);
        const generalProducts = generalSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !contextProducts.find(cp => cp.id === p.id) && p.id !== currentProduct.id);
        
        // Combine everything
        const combined = [currentProduct, ...contextProducts];
        
        if (generalProducts.length > 0) {
          combined.push({ 
            id: 'feed-transition', 
            isTransition: true, 
            contextName: currentSubcategory || currentCategory || 'Featured'
          });
          combined.push(...generalProducts);
        }
        
        setProducts(combined);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCurrentAndReelProducts();
  }, [id, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setShowScrollHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async (product: any) => {
    if (isSharing.current) return;
    
    const refCode = userData?.referralCode;
    const url = `${window.location.origin}/product/${product.id}${refCode ? `?ref=${refCode}` : ''}`;
    
    if (navigator.share) {
      isSharing.current = true;
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Namate!`,
          url: url,
        });
        // Award points for sharing
        await awardPoints(100, `Shared product: ${product.name}`);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      } finally {
        isSharing.current = false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
        // Award points for sharing
        await awardPoints(100, `Shared product: ${product.name}`);
      } catch (error) {
        console.error("Clipboard error:", error);
      }
    }
  };

  const handleAddToCart = (product: any) => {
    const size = selectedSize[product.id];
    if (!size && product.sizes?.length > 0) {
      triggerHaptic('error');
      toast.error("Please select a size first");
      return;
    }
    triggerHaptic('success');
    addToCart(product, size || '');
  };

  const scrollToNext = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  const scrollToPrev = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-4 bg-white">
        <h1 className="text-4xl font-black mb-4 uppercase text-black">No Products Found</h1>
        <Link to="/shop">
          <Button className="bg-black text-white font-bold">BACK TO SHOP</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      {/* Back Button Overlay */}
      <div className="absolute top-6 left-6 z-[110] flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            triggerHaptic('light');
            navigate(-1);
          }}
          className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 w-12 h-12"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Viewing</span>
            {currentCategory && (
              <Badge className="bg-[#C5A059] text-white border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                {currentCategory}
              </Badge>
            )}
          </div>
          {currentSubcategory && (
            <span className="text-[14px] font-black text-white uppercase tracking-tighter leading-none mt-1">
              {currentSubcategory}
            </span>
          )}
        </div>
      </div>

      {/* Feed Choice Overlay */}
      <div className="absolute top-6 right-20 z-[110]">
        <button 
          onClick={() => {
            triggerHaptic('medium');
            setShowFeedMenu(!showFeedMenu);
          }}
          className={cn(
            "h-12 px-6 rounded-full flex items-center gap-3 transition-all",
            showFeedMenu ? "bg-white text-black" : "bg-black/20 backdrop-blur-md text-white border border-white/10"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Change Feed</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", showFeedMenu && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showFeedMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-16 right-0 w-64 bg-white rounded-3xl shadow-2xl p-6 border border-black/5 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4 opacity-40">
                <Filter className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-widest text-black">Vibe Collections</span>
              </div>
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    navigate('/shop');
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-black/5 transition-colors group flex items-center justify-between"
                >
                  <span className="text-[11px] font-black uppercase tracking-tight text-black">Explore All</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-black" />
                </button>

                <div className="h-[1px] bg-black/5 my-2" />

                {categories.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button 
                      onClick={() => {
                        triggerHaptic('light');
                        setExpandedCategory(expandedCategory === cat.name ? null : cat.name);
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all group flex items-center justify-between",
                        expandedCategory === cat.name ? "bg-black text-white" : "hover:bg-black/5 text-black"
                      )}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-tight">{cat.name} Feed</span>
                      <ChevronRight className={cn(
                        "w-3 h-3 transition-transform", 
                        expandedCategory === cat.name ? "rotate-90 text-white" : "text-black/20 group-hover:text-black"
                      )} />
                    </button>

                    <AnimatePresence>
                      {expandedCategory === cat.name && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-black/5 rounded-xl ml-2 mr-2"
                        >
                          <button 
                            onClick={() => navigate(`/shop?category=${cat.name}`)}
                            className="w-full text-left py-2 px-4 hover:bg-black/5 text-[10px] font-black uppercase tracking-widest text-[#C5A059]"
                          >
                            View All {cat.name}
                          </button>
                          {cat.subcategories?.map((sub: string) => (
                            <button
                              key={sub}
                              onClick={() => {
                                triggerHaptic('light');
                                navigate(`/shop?category=${cat.name}&subcategory=${sub}`);
                              }}
                              className="w-full text-left py-2.5 px-4 hover:bg-black/5 text-[10px] font-bold uppercase tracking-tight text-black/60 hover:text-black border-t border-black/5"
                            >
                              {sub}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll Hint */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2"
          >
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Scroll up for next</span>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronUp className="w-6 h-6 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical Navigation Controls removed per user request */}

      {/* Vertical Feed */}
      <div 
        ref={containerRef}
        className="flex-grow overflow-y-scroll snap-y snap-mandatory no-scrollbar h-full"
        onScroll={() => setShowScrollHint(false)}
      >
        {products.map((product, index) => {
          if (product.isTransition) {
            return (
              <div key="transition" className="h-screen flex flex-col items-center justify-center snap-start bg-black text-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-[#C5A059]" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">You've explored the {product.contextName} collection</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto">
                    Continuing with more curated vibes from the Namate Tribe...
                  </p>
                  
                  {/* Change Feed Suggestions */}
                  <div className="flex flex-col items-center gap-4 py-8">
                    <p className="text-[8px] font-black text-[#C5A059] uppercase tracking-[0.4em]">Want to change the vibe?</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm px-4">
                      {categories.slice(0, 4).map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            triggerHaptic('medium');
                            navigate(`/shop?category=${cat.name}`);
                          }}
                          className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ChevronDown className="w-8 h-8 text-white/20 mx-auto" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            );
          }
          return (
            <ReelItem 
              key={product.id}
              product={product}
              index={index}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isInWishlist={isInWishlist}
              toggleWishlist={toggleWishlist}
              setShowFloatingHeart={setShowFloatingHeart}
              handleShare={handleShare}
              handleAddToCart={handleAddToCart}
              selectedSize={selectedSize[product.id] || ''}
              setSelectedSize={(size) => setSelectedSize(prev => ({ ...prev, [product.id]: size }))}
              userData={userData}
              isAdmin={isAdmin}
            />
          );
        })}
        
        {/* End of Reel Brand Signature */}
        <div className="h-screen flex items-center justify-center snap-start bg-black">
          <BrandSignature variant="light" className="opacity-80 scale-150" />
        </div>
      </div>

      <FloatingHeart 
        isVisible={showFloatingHeart} 
        onComplete={() => setShowFloatingHeart(false)} 
      />
    </div>
  );
}
