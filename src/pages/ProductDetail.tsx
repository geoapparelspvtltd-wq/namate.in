import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ShoppingBag, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Play, 
  Volume2, 
  VolumeX, 
  X, 
  MessageSquare, 
  Sparkles, 
  Wand2, 
  MapPin, 
  Info, 
  CheckCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from '@/components/ProductCard';
import BrandSignature from '@/components/BrandSignature';
import FloatingHeart from '@/components/FloatingHeart';
import ProductReviews from '@/components/ProductReviews';
import { cn, getYoutubeEmbedUrl } from '@/lib/utils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { triggerHaptic } from '@/lib/haptics';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, userData, awardPoints } = useAuth();
  
  // Product Details States
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [reelMedia, setReelMedia] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  
  // Interaction States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showFloatingHeart, setShowFloatingHeart] = useState(false);
  
  // Pincode & Delivery Info
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'serviceable' | 'unserviceable'>('idle');
  const [deliveryEstimate, setDeliveryEstimate] = useState('');

  // Video Reel Overlay View States (for legacy/reel content)
  const [showReelOverlay, setShowReelOverlay] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Load Product Extra Details helpers
  const productMeta = useMemo(() => {
    if (!product) return { pattern: 'Solid', fabric: 'Premium Fabric', discount: 0, deliveryDays: 3 };
    
    const nameL = (product.name || '').toLowerCase();
    const descL = (product.description || '').toLowerCase();
    
    let pattern = product.pattern || 'Solid';
    if (nameL.includes('print') || descL.includes('print')) pattern = 'Printed';
    else if (nameL.includes('stripe') || descL.includes('stripe')) pattern = 'Striped';
    else if (nameL.includes('check') || descL.includes('check')) pattern = 'Checked';
    else if (nameL.includes('embroid') || descL.includes('embroid')) pattern = 'Embroidered';

    let fabric = product.fabric || 'Cotton Blend';
    if (nameL.includes('linen') || descL.includes('linen')) fabric = 'Linen';
    else if (nameL.includes('denim') || descL.includes('denim')) fabric = 'Denim';
    else if (nameL.includes('silk') || descL.includes('silk')) fabric = 'Silk';
    else if (nameL.includes('wool') || descL.includes('wool')) fabric = 'Wool';
    else if (nameL.includes('polyester') || descL.includes('polyester')) fabric = 'Polyester';

    const discount = product.discount || (product.originalPrice && product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
    const deliveryDays = product.deliveryDays || (product.id ? (product.id.charCodeAt(0) % 3) + 2 : 3);

    return { pattern, fabric, discount, deliveryDays };
  }, [product]);

  // Handle Share Functionality
  const handleShare = async () => {
    if (!product) return;
    const refCode = userData?.referralCode;
    const url = `${window.location.origin}/product/${product.id}${refCode ? `?ref=${refCode}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Namate!`,
          url: url,
        });
        await awardPoints(100, `Shared product: ${product.name}`);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Error sharing:", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
        await awardPoints(100, `Shared product: ${product.name}`);
      } catch (error) {
        console.error("Clipboard error:", error);
      }
    }
  };

  // Double tap handler for product image
  const [lastTap, setLastTap] = useState(0);
  const handleImageDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      handleWishlistAction();
    } else {
      setLastTap(now);
    }
  };

  const handleWishlistAction = () => {
    if (!product) return;
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
    }
  };

  const handleAddToCartAction = () => {
    if (!product) return;
    if (product.sizes?.length > 0 && !selectedSize) {
      triggerHaptic('error');
      toast.error('Please select a size first!', {
        description: 'Choose your preferred size to add to bag.',
        position: 'top-center',
      });
      return;
    }
    triggerHaptic('success');
    addToCart(product, selectedSize || '');
    toast.success('Added to Bag!', {
      description: `${product.name} (${selectedSize || 'Standard'}) added to your bag.`,
    });
  };

  const handleTryOnAction = () => {
    if (!product) return;
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

  // Check serviceable pincode
  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length !== 6 || isNaN(Number(pincode))) {
      triggerHaptic('error');
      toast.error("Invalid Pincode", { description: "Please enter a valid 6-digit Pincode." });
      return;
    }

    triggerHaptic('light');
    setPincodeStatus('checking');

    setTimeout(() => {
      const deliveryDays = productMeta.deliveryDays;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
      const optionsStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      
      setPincodeStatus('serviceable');
      setDeliveryEstimate(`Delivery by ${optionsStr}`);
      toast.success("Pincode Serviceable", { description: `Delivery estimate established for area ${pincode}` });
    }, 1200);
  };

  // Initial Fetches
  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const productSnap = await getDoc(doc(db, 'products', id));
        if (!productSnap.exists()) {
          toast.error("Product not found");
          navigate('/shop');
          return;
        }

        const data = { id: productSnap.id, ...productSnap.data() } as any;
        setProduct(data);

        // Fetch Subcollections
        const gallerySnap = await getDocs(collection(db, 'products', id, 'gallery'));
        const galleryUrls = gallerySnap.docs.map(doc => doc.data().url);
        
        const mainImage = data.image || '/src/assets/placeholder.png';
        const docImages = Array.isArray(data.images) ? data.images : [];
        const fullImagesList = Array.from(new Set([mainImage, ...docImages, ...galleryUrls])).filter(Boolean);
        setGalleryImages(fullImagesList);

        const mediaSnap = await getDocs(collection(db, 'products', id, 'media'));
        setReelMedia(mediaSnap.docs.map(doc => doc.data()));

        // Fetch Related Products (same category/subcategory)
        if (data.category) {
          const q = query(
            collection(db, 'products'),
            where('category', '==', data.category),
            limit(6)
          );
          const relatedSnap = await getDocs(q);
          const list = relatedSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(item => item.id !== id);
          setRelatedProducts(list);
        }
      } catch (err) {
        console.error("Error loading product detail info:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
    // Scroll back to top on transitions
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-black/55 animate-pulse">Loading bespoke options...</span>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-28 text-neutral-800 font-sans relative">
      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 lg:p-8">
        
        {/* Left Hand: High fidelity image viewer & story section */}
        <div className="space-y-4">
          {/* Primary View */}
          <div 
            className="w-full relative h-[450px] sm:h-[600px] bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm group select-none"
            onClick={handleImageDoubleTap}
          >
            {/* Try-On Launch Overlay floating top action badge */}
            <div className="absolute top-4 left-4 z-40 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTryOnAction();
                }}
                className="flex items-center gap-2 bg-[#C5A059] text-white py-2 px-4 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-[#C5A059]/15"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI Try-On</span>
              </motion.button>
            </div>

            {/* Pagination Floating Capsule */}
            <div className="absolute bottom-4 right-4 z-40 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[9px] font-black tracking-widest">
              {activeImageIndex + 1} / {galleryImages.length}
            </div>

            {/* Slider container */}
            <AnimatePresence mode="wait">
              <motion.img
                key={galleryImages[activeImageIndex]}
                src={galleryImages[activeImageIndex]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>

            {/* Left/Right controls overlay */}
            <div className="absolute inset-y-0 left-0 w-16 z-30 flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setActiveImageIndex(prev => prev === 0 ? galleryImages.length - 1 : prev - 1);
                }}
                className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white text-black"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="absolute inset-y-0 right-0 w-16 z-30 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  setActiveImageIndex(prev => prev === galleryImages.length - 1 ? 0 : prev + 1);
                }}
                className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white text-black"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Thumbnails row */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveImageIndex(i);
                  }}
                  className={cn(
                    "w-16 h-20 rounded-xl bg-white border-2 flex-shrink-0 p-1 transition-all overflow-hidden",
                    activeImageIndex === i ? "border-[#C5A059] scale-105" : "border-neutral-100 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Hand: Product Information, Size selections, Pricing, Delivery, Specs & Reviews united in one cohesive premium cards area */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-[32px] border border-neutral-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.03)] overflow-hidden divide-y divide-neutral-100">
            
            {/* 1. Brand, Title, Description, and Rating Header */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-[#C5A059] flex items-center justify-between animate-fade-in">
                {product.brand ? <span>{product.brand}</span> : <span />}
                
                {/* Rating Star overlay capsule */}
                {(product.averageRating || 0) > 0 && (
                  <div className="bg-neutral-50 px-2.5 py-1 rounded-full border border-neutral-100 flex items-center gap-1.5 text-neutral-800 text-[10px] font-black shadow-smnormal">
                    <span>{(product.averageRating || 4.2).toFixed(1)}</span>
                    <Star className="w-3 h-3 fill-[#C5A059] text-[#C5A059]" />
                    <span className="text-neutral-400 font-bold border-l border-neutral-200 pl-1.5 ml-0.5">
                      {product.reviewCount || 18} Specs
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start gap-4">
                <h2 className="text-lg sm:text-2xl font-black text-black leading-tight uppercase tracking-tight flex-grow">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Share Action */}
                  <button 
                    onClick={() => {
                      triggerHaptic('light');
                      handleShare();
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors text-black"
                    title="Share product"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Wishlist Toggle */}
                  <button 
                    onClick={handleWishlistAction}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors text-black"
                    title="Add to wishlist"
                  >
                    <Heart className={cn("w-3.5 h-3.5", isInWishlist(product.id) && "fill-black text-black")} />
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-sm font-medium text-neutral-500 italic leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* 2. Price Details & Rewards Information */}
            <div className="p-6 sm:p-8 space-y-4 bg-neutral-50/25">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-black">
                  ₹{product.price}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-neutral-400 line-through text-md sm:text-lg font-bold">
                      ₹{product.originalPrice}
                    </span>
                    {productMeta.discount > 0 && (
                      <span className="text-[#5AA67B] font-black text-sm uppercase tracking-tight">
                        ({productMeta.discount}% OFF)
                      </span>
                    )}
                  </>
                )}
              </div>
              
              <p className="text-[10px] font-bold text-neutral-400 tracking-wide uppercase">
                inclusive of all statutory taxes & duties
              </p>

              <div className="border-t border-dashed border-neutral-200/60 pt-4 flex gap-3 items-center">
                <div className="p-2 bg-[#C5A059]/10 rounded-xl text-[#C5A059]">
                  <Sparkles className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div>
                  <span className="text-xs font-black text-neutral-800 uppercase tracking-widest block">Tribe Rewards</span>
                  <span className="text-[10px] font-bold text-neutral-500 block">Buy today and earn <strong className="text-black">{(product.price * 10).toLocaleString()} coins</strong> toward your rewards chest.</span>
                </div>
              </div>
            </div>

            {/* 3. Sizes Selector */}
            {product.sizes?.length > 0 && (
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C5A059]">Select Size</span>
                  <button 
                    onClick={() => setShowSizeChart(true)}
                    className="text-xs font-black text-black hover:text-[#C5A059] hover:underline uppercase tracking-widest"
                  >
                    Size Chart
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((sz: string) => (
                    <button
                      key={sz}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedSize(sz);
                      }}
                      className={cn(
                        "min-w-[48px] h-12 rounded-xl text-xs font-black uppercase tracking-wide border-2 transition-all flex items-center justify-center px-3",
                        selectedSize === sz 
                          ? "bg-black text-white border-black scale-105 shadow-md shadow-black/10"
                          : "bg-white text-neutral-700 border-neutral-200 hover:border-black/20"
                      )}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Delivery Estimation Details */}
            <div className="p-6 sm:p-8 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-[#C5A059] block">Delivery Details</span>
              
              <form onSubmit={handlePincodeCheck} className="flex gap-2">
                <div className="relative flex-grow">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    type="text" 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    placeholder="Enter Pincode (6 digits)" 
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-10 text-xs font-black tracking-widest focus:outline-none focus:border-black placeholder:text-neutral-400"
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={pincodeStatus === 'checking'}
                  className="bg-black hover:bg-neutral-900 text-white font-black text-[10px] uppercase tracking-wider py-3 px-6 rounded-xl flex-shrink-0"
                >
                  {pincodeStatus === 'checking' ? 'Checking...' : 'Check'}
                </Button>
              </form>

              {pincodeStatus === 'serviceable' && (
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-xl animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Excellent! Pincode active. <strong>{deliveryEstimate}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                  <span>Genuine guaranteed</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#C5A059]" />
                  <span>Easy 14 day exchange</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C5A059]" />
                  <span>Free booking trial</span>
                </div>
              </div>
            </div>

            {/* 5. Product Specifications Grid */}
            <div className="p-6 sm:p-8 space-y-4 bg-neutral-50/25">
              <span className="text-xs font-black uppercase tracking-widest text-[#C5A059] block">Product Specifications</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border-b border-neutral-100 pb-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Material/Fabric</span>
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wide mt-0.5 block">{productMeta.fabric}</span>
                </div>

                <div className="border-b border-neutral-100 pb-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Theme / Pattern</span>
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wide mt-0.5 block">{productMeta.pattern}</span>
                </div>

                <div className="border-b border-neutral-100 pb-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Care Method</span>
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wide mt-0.5 block">Delicate Hand Wash Only</span>
                </div>

                <div className="border-b border-neutral-100 pb-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Production Fit</span>
                  <span className="text-xs font-black uppercase text-neutral-800 tracking-wide mt-0.5 block">Bespoke Fit Cut</span>
                </div>
              </div>
            </div>

            {/* 6. Cohesive Reviews Inside Main Card */}
            <div className="p-6 sm:p-8">
              <ProductReviews productId={product.id} productName={product.name} />
            </div>

          </div>

          {/* Action Row Add to Bag & Try On Overlay buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAddToCartAction}
              className="h-14 rounded-2xl bg-black text-white hover:bg-neutral-900 border border-neutral-200 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Bag
            </Button>

            <Button
              onClick={handleTryOnAction}
              className="h-14 rounded-2xl bg-gradient-to-r from-[#D5B069] to-[#A58039] hover:opacity-95 text-white shadow-lg transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border-none"
            >
              <Wand2 className="w-4 h-4" />
              Virtual Try-On
            </Button>
          </div>

        </div>

      </div>

      {/* Similar products carousel display sheets */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-4 border-t border-neutral-200 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black uppercase tracking-tight text-neutral-800">Customers also viewed</h3>
            <Link to="/shop" className="text-xs font-black uppercase tracking-widest text-[#C5A059] hover:underline">View Shop</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {relatedProducts.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                originalPrice={p.originalPrice}
                image={p.image || (p.images && p.images[0])}
                images={p.images}
                badge={p.badge}
                category={p.category}
                sizes={p.sizes || []}
                averageRating={p.averageRating || 0}
                reviewCount={p.reviewCount || 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Video Reel Overlay modal view */}
      <AnimatePresence>
        {showReelOverlay && reelMedia.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4 pt-16"
          >
            <div className="absolute top-6 right-6 flex items-center gap-3">
              {/* Mute/Unmute */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsMuted(!isMuted);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowReelOverlay(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Reel media viewer content box */}
            <div className="w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
              {reelMedia[0].type === 'youtube' || getYoutubeEmbedUrl(reelMedia[0].url) ? (
                <iframe 
                  src={(getYoutubeEmbedUrl(reelMedia[0].url) || reelMedia[0].url) + (isMuted ? "" : "&mute=0")}
                  className="w-full h-full border-none"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title="YouTube video player"
                />
              ) : (
                <video 
                  src={reelMedia[0].url} 
                  autoPlay 
                  loop 
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <span className="text-[10px] text-white/50 font-black uppercase tracking-widest mt-4">
              Currently playing product story reel for {product.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Size Chart modal overlay popup */}
      <AnimatePresence>
        {showSizeChart && (
          <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm border border-neutral-100 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <span className="text-sm font-black uppercase tracking-widest text-[#C5A059]">Bespoke Size Chart</span>
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowSizeChart(false);
                  }}
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Standard chest, shoulder measurements detailed charts */}
              <div className="space-y-3">
                <table className="w-full text-left text-xs text-neutral-500 font-bold border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-800 font-black uppercase tracking-wider">
                      <th className="py-2.5">Size</th>
                      <th className="py-2.5">Chest (In)</th>
                      <th className="py-2.5">Shoulder (In)</th>
                      <th className="py-2.5">Length (In)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">XS</td>
                      <td className="py-2.5">36 in</td>
                      <td className="py-2.5">16.5 in</td>
                      <td className="py-2.5">26.5 in</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">S</td>
                      <td className="py-2.5">38 in</td>
                      <td className="py-2.5">17.0 in</td>
                      <td className="py-2.5">27.0 in</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">M</td>
                      <td className="py-2.5">40 in</td>
                      <td className="py-2.5">17.5 in</td>
                      <td className="py-2.5">27.5 in</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">L</td>
                      <td className="py-2.5">42 in</td>
                      <td className="py-2.5">18.0 in</td>
                      <td className="py-2.5">28.0 in</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">XL</td>
                      <td className="py-2.5">44 in</td>
                      <td className="py-2.5">18.5 in</td>
                      <td className="py-2.5">28.5 in</td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5 font-black text-black">XXL</td>
                      <td className="py-2.5">46 in</td>
                      <td className="py-2.5">19.0 in</td>
                      <td className="py-2.5">29.0 in</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="p-3 bg-neutral-50 rounded-xl flex items-start gap-2 text-[10px] text-neutral-500 leading-normal font-bold">
                  <Info className="w-4 h-4 text-[#C5A059] flex-shrink-0 mt-0.5" />
                  <span>Measurements can vary by +/- 0.5 inches depending on material design stretches.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FloatingHeart 
        isVisible={showFloatingHeart} 
        onComplete={() => setShowFloatingHeart(false)} 
      />
    </div>
  );
}
