import React, { useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, Truck, RotateCcw, ShieldCheck, Star, ChevronLeft, Share2, Play, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from '@/components/ProductCard';
import BrandSignature from '@/components/BrandSignature';
import FloatingHeart from '@/components/FloatingHeart';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
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
  index
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
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const displayImages = useMemo(() => {
    const images = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      images.push(...product.images.filter((img: any) => typeof img === 'string' && img.length > 0));
    }
    if (images.length === 0 && typeof product.image === 'string' && product.image.length > 0) {
      images.push(product.image);
    }
    if (images.length === 0) {
      images.push('https://picsum.photos/seed/fashion/600/800');
    }
    return images;
  }, [product]);

  useEffect(() => {
    if (product.videoUrl || displayImages.length <= 1 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [displayImages, product.videoUrl, isAutoPlaying]);

  const nextImage = () => {
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="h-full w-full snap-start relative flex flex-col bg-black overflow-hidden">
      {/* Media Background */}
      <div className="absolute inset-0 z-0 bg-black">
        {product.videoUrl ? (
          <video 
            src={product.videoUrl} 
            autoPlay 
            loop 
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover opacity-100"
          />
        ) : (
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImageIndex}
                src={displayImages[currentImageIndex]} 
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
                  if (info.offset.x > 50) prevImage();
                  else if (info.offset.x < -50) nextImage();
                }}
              />
            </AnimatePresence>

            {/* Tap areas for navigation */}
            <div className="absolute inset-0 flex z-10">
              <div className="w-1/4 h-full cursor-pointer" onClick={prevImage} />
              <div className="w-1/2 h-full cursor-pointer" onClick={() => setIsAutoPlaying(!isAutoPlaying)} />
              <div className="w-1/4 h-full cursor-pointer" onClick={nextImage} />
            </div>

            {/* Manual Navigation Arrows (Images) */}
            {displayImages.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-white hover:bg-black/40 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-white hover:bg-black/40 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </>
            )}

            {/* Pagination Dots */}
            {displayImages.length > 1 && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {displayImages.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      currentImageIndex === idx ? "bg-white w-6" : "bg-white/30 w-2"
                    )} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
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

        {product.videoUrl && (
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
        </div>

        <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none mb-1.5">
          {product.name}
        </h2>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-lg font-black text-white">₹{product.price}</span>
          {product.originalPrice && (
            <span className="text-[10px] text-white/40 line-through font-bold">₹{product.originalPrice}</span>
          )}
        </div>

        {/* Compact Description */}
        <p className="text-white/60 text-[9px] font-medium line-clamp-1 mb-3 max-w-[85%]">
          {product.description}
        </p>

        {/* Size Selector */}
        {product.sizes?.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {product.sizes.map((size: string) => (
                <button 
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "w-8 h-8 rounded-lg border font-black text-[10px] transition-all flex-shrink-0",
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
        <Button 
          onClick={() => handleAddToCart(product)}
          className="w-full h-12 bg-white text-black font-black text-xs rounded-xl hover:bg-white/90 transition-all shadow-2xl active:scale-[0.98]"
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          ADD TO CART
        </Button>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
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
    const url = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on Namate!`,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy link");
      });
    }
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

      {/* Vertical Navigation Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] flex flex-col gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={scrollToPrev}
          className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 w-10 h-10"
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={scrollToNext}
          className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 w-10 h-10"
        >
          <ChevronDown className="w-6 h-6" />
        </Button>
      </div>

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
            selectedSize={selectedSize[product.id]}
            setSelectedSize={(size) => setSelectedSize(prev => ({ ...prev, [product.id]: size }))}
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
