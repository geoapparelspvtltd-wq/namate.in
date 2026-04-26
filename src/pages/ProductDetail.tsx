import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, Truck, RotateCcw, ShieldCheck, Star, ChevronLeft, Share2, Play, Volume2, VolumeX, ChevronUp, ChevronDown, Eye, X, MessageSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from '@/components/ProductCard';
import BrandSignature from '@/components/BrandSignature';
import FloatingHeart from '@/components/FloatingHeart';
import FloatingBag from '@/components/FloatingBag';
import ProductReviews from '@/components/ProductReviews';
import { cn, getYoutubeEmbedUrl } from '@/lib/utils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useEffect } from 'react';

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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [galleryMedia, setGalleryMedia] = useState<{url: string}[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const gallerySnap = await getDocs(query(collection(db, 'products', product.id, 'gallery'), orderBy('createdAt', 'asc')));
        setGalleryMedia(gallerySnap.docs.map(d => ({ url: d.data().url })));
      } catch (error) {
        console.error("Error fetching gallery in reel:", error);
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
    fetchReviewCount();
  }, [product.id]);

  const media = useMemo(() => {
    // If unified media exists, use it as is (respecting user order)
    if (product.media && Array.isArray(product.media) && product.media.length > 0) {
      return product.media.map((m: any) => {
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
  }, [product]);

  useEffect(() => {
    const currentItem = media[currentMediaIndex];
    if (!currentItem || currentItem.type === 'video' || media.length <= 1 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % media.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [media, currentMediaIndex, isAutoPlaying]);

  const nextMedia = () => {
    setIsAutoPlaying(false);
    setCurrentMediaIndex((prev) => (prev + 1) % media.length);
  };

  const prevMedia = () => {
    setIsAutoPlaying(false);
    setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const currentMedia = media[currentMediaIndex];

  return (
    <div className="h-full w-full snap-start relative flex flex-col bg-black overflow-hidden">
      {/* Media Background */}
      <div className="absolute inset-0 z-0 bg-black">
        <div className="relative w-full h-full">
          <AnimatePresence mode="wait">
            {currentMedia.type === 'youtube' ? (
              <motion.div
                key={`youtube-${currentMedia.url}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <iframe 
                  src={currentMedia.url + (isMuted ? "" : "&mute=0")}
                  className="w-full h-full border-none"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title="YouTube video player"
                />
              </motion.div>
            ) : currentMedia.type === 'video' ? (
              <motion.div
                key={`video-${currentMedia.url}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <video 
                  src={currentMedia.url} 
                  autoPlay 
                  loop 
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ) : (
              <motion.img 
                key={`image-${currentMedia.url}`}
                src={currentMedia.url} 
                alt={product.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full object-contain"
                referrerPolicy="no-referrer"
                loading={index === 0 ? "eager" : "lazy"}
                {...(index === 0 ? { fetchPriority: "high" } : {})}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== 'https://picsum.photos/seed/fashion/600/800') {
                    target.src = 'https://picsum.photos/seed/fashion/600/800';
                  }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 50) prevMedia();
                  else if (info.offset.x < -50) nextMedia();
                }}
              />
            )}
          </AnimatePresence>

          {/* Tap areas for navigation */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/4 h-full cursor-pointer" onClick={prevMedia} />
            <div className="w-1/2 h-full cursor-pointer" onClick={() => setIsAutoPlaying(!isAutoPlaying)} />
            <div className="w-1/4 h-full cursor-pointer" onClick={nextMedia} />
          </div>

          {/* Manual Navigation Arrows removed per user request */}

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
          onClick={() => {
            const wasInWishlist = isInWishlist(product.id);
            toggleWishlist({ id: product.id, name: product.name, price: product.price, image: product.image || (product.images && product.images[0]) });
            if (!wasInWishlist) setShowFloatingHeart(true);
          }}
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
          onClick={() => handleShare(product)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Share</span>
        </button>

        <button 
          onClick={() => setShowReviews(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">{reviewCount || 'Reviews'}</span>
        </button>

        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={() => {
            handleAddToCart(product);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest drop-shadow-md">Bag</span>
        </motion.button>

        {galleryMedia.length > 0 && (
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={() => setShowGallery(true)}
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
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Product Info Overlay */}
      <div className="mt-auto relative z-20 p-4 pb-6 bg-gradient-to-t from-black via-black/40 to-transparent">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge className="bg-white text-black border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
            {product.category}
          </Badge>
          {product.isNew && (
            <Badge className="bg-white/20 text-white border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
              New
            </Badge>
          )}
          {product.isUpcoming && (
            <Badge className="bg-white text-black border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
              Upcoming
            </Badge>
          )}
          {product.isTribeExclusive && (
            <Badge className="bg-[#C5A059] text-white border-none font-black text-[7px] uppercase tracking-widest px-1.5 py-0.5">
              Tribe
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
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "w-7 h-7 rounded-lg border font-black text-[9px] transition-all flex-shrink-0",
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
            className="w-full h-10 bg-white/20 text-white font-black text-[10px] rounded-xl border border-white/10 transition-all opacity-50"
          >
            COMING SOON
          </Button>
        ) : product.isTribeExclusive && !userData?.isTribeMember && !isAdmin ? (
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/tribe')}
              className="w-full h-10 bg-[#C5A059] text-white font-black text-[10px] rounded-xl hover:bg-[#B59049] transition-all shadow-2xl active:scale-[0.98]"
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
            className="w-full h-10 bg-white text-black font-black text-[10px] rounded-xl hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98]"
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
                onClick={() => setShowGallery(false)}
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
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl"
                    >
                      <img 
                        src={m.url} 
                        alt={`Gallery ${i}`} 
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'products'));
        const snapshot = await getDocs(q);
        const allProducts = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(0)
          };
        });
        
        // Sort client-side
        allProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // Move the current product to the top or find its index
        const currentIndex = allProducts.findIndex(p => p.id === id);
        if (currentIndex !== -1) {
          const currentProduct = allProducts.splice(currentIndex, 1)[0];
          allProducts.unshift(currentProduct);
        }
        
        setProducts(allProducts);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => setShowScrollHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = (product: any) => {
    const refCode = userData?.referralCode;
    const url = `${window.location.origin}/product/${product.id}${refCode ? `?ref=${refCode}` : ''}`;
    
    const shareAction = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: product.name,
            text: `Check out ${product.name} on Namate!`,
            url: url,
          });
          // Award points for sharing
          await awardPoints(100, `Shared product: ${product.name}`);
        } catch (error) {
          console.error("Error sharing:", error);
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!");
          // Award points for sharing
          await awardPoints(100, `Shared product: ${product.name}`);
        } catch (error) {
          toast.error("Failed to copy link");
        }
      }
    };

    shareAction();
  };

  const handleAddToCart = (product: any) => {
    const size = selectedSize[product.id];
    if (!size && product.sizes?.length > 0) {
      toast.error("Please select a size first");
      return;
    }
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
      <div className="absolute top-6 left-6 z-[110]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 w-12 h-12"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
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
        {products.map((product, index) => (
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
        ))}
        
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
