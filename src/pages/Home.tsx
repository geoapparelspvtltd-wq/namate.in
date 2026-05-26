import { useState, useMemo, useEffect, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, TrendingUp, Zap, Heart, Search, Mic, Image as LucideImage, ChevronRight, ChevronLeft, X } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { cn } from '@/lib/utils';
import AnimatedBrandName from '@/components/AnimatedBrandName';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';
import EndOfFeedSuggestions from '@/components/EndOfFeedSuggestions';
import CategoryStrip from '@/components/CategoryStrip';
import CategoryQuickNav from '@/components/CategoryQuickNav';
import { useWishlist } from '@/lib/WishlistContext';
import { useSearch } from '@/lib/SearchContext';
import { useAuth } from '@/lib/AuthContext';

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
  // Don't throw here to avoid crashing the component
}

export default function Home() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { role, user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [allCategoryConfigs, setAllCategoryConfigs] = useState<any[]>([]);
  const [subcategoryConfigs, setSubcategoryConfigs] = useState<any[]>([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { wishlist } = useWishlist();

  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.1]);
  const textParallax = useTransform(scrollY, [0, 500], [0, 150]);
  const titleParallax = useTransform(scrollY, [0, 500], [0, 100]);
  const searchParallax = useTransform(scrollY, [0, 500], [0, 50]);
  const heroRotateX = useTransform(scrollY, [0, 600], [0, 20]);

  // Auto-rotate gallery
  useEffect(() => {
    if (galleryImages.length <= 1 || !isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrentGalleryIndex(prev => (prev + 1) % galleryImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [galleryImages.length, currentGalleryIndex, isAutoPlay]);

  // Preload next gallery image
  useEffect(() => {
    if (galleryImages.length > 1) {
      const nextIndex = (currentGalleryIndex + 1) % galleryImages.length;
      const img = new Image();
      img.src = galleryImages[nextIndex].url;
    }
  }, [currentGalleryIndex, galleryImages]);

  // Load cache on mount for superfast initial render
  useEffect(() => {
    const cachedData = localStorage.getItem('home_data_cache');
    if (cachedData) {
      try {
        const { gallery, products, subConfigs, catConfigs } = JSON.parse(cachedData);
        if (gallery) setGalleryImages(gallery);
        if (products) setProducts(products);
        if (subConfigs) setSubcategoryConfigs(subConfigs);
        if (catConfigs) setAllCategoryConfigs(catConfigs);
        setIsLoading(false);
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }
  }, []);

  // Sync cache when data changes
  useEffect(() => {
    if (products.length > 0) {
      try {
        const dataToCache = {
          gallery: galleryImages,
          products: products,
          subConfigs: subcategoryConfigs,
          catConfigs: allCategoryConfigs
        };
        localStorage.setItem('home_data_cache', JSON.stringify(dataToCache));
      } catch (error) {
        console.warn("Storage quota exceeded or error occurred while updating home cache:", error);
      }
    }
  }, [galleryImages, products, subcategoryConfigs, allCategoryConfigs]);

  const handleNext = () => {
    if (galleryImages.length <= 1) return;
    triggerHaptic('medium');
    setCurrentGalleryIndex(prev => (prev + 1) % galleryImages.length);
  };

  const handlePrev = () => {
    if (galleryImages.length <= 1) return;
    triggerHaptic('medium');
    setCurrentGalleryIndex(prev => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  useEffect(() => {
    // Fetch store gallery images with real-time listener
    const gQ = query(collection(db, 'store_gallery'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(gQ, (snapshot) => {
      setGalleryImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Gallery Sync Error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch all category configs
    const fetchConfigs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'category_configs'));
        const allConfigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllCategoryConfigs(allConfigs);
        
        const homeConfigs = allConfigs
          .filter((c: any) => c.showOnHome)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        setCategoryConfigs(homeConfigs);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'category_configs');
      }
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    // Fetch all subcategory configs
    const fetchSubConfigs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'subcategory_configs'));
        const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubcategoryConfigs(configs);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'subcategory_configs');
      }
    };
    fetchSubConfigs();
  }, []);

  useEffect(() => {
    // Fetch latest products with a real-time listener
    // We order by createdAt desc to see newest products first
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(40));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(0)
        };
      });
      
      // Shuffle products randomly
      const shuffled = [...firestoreProducts];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      setProducts(shuffled);
      setIsLoading(false);
    }, (error) => {
      console.error("Error in Home.tsx products listener:", error);
      // Fallback if index is missing
      if (error.code === 'failed-precondition') {
        const fallbackQ = query(collection(db, 'products'), limit(40));
        onSnapshot(fallbackQ, (snapshot) => {
          const rawProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          // Shuffle products randomly
          const shuffledFallback = [...rawProducts];
          for (let i = shuffledFallback.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledFallback[i], shuffledFallback[j]] = [shuffledFallback[j], shuffledFallback[i]];
          }
          setProducts(shuffledFallback as any);
          setIsLoading(false);
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.subcategory?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.badge?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, products]);

  const productsBySubcategory = useMemo(() => {
    // Get unique subcategories from products actually fetched
    const uniqueSubcats = Array.from(new Set(products.map(p => p.subcategory || p.category || 'General').filter(Boolean)));
    
    // Merge with configs if they exist, but don't exclude products if config is missing
    const groups = uniqueSubcats.map(name => {
      const config = subcategoryConfigs.find(c => c.name === name);
      return {
        title: name,
        showOnHome: config ? config.showOnHome : true, // Default to true
        order: config ? config.order : 999,
        products: products.filter(p => (p.subcategory || p.category || 'General') === name)
      };
    });

    // Filter by visibility and sort
    return groups
      .filter(g => g.showOnHome && g.products.length > 0)
      .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));
  }, [products, subcategoryConfigs]);

  const quickNavCategories = useMemo(() => {
    // Get unique categories from products
    const uniqueCategoryNames = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    
    return uniqueCategoryNames.map(name => {
      const config = allCategoryConfigs.find(c => c.name === name);
      // Get subcategories for this category from products
      const subcats = Array.from(new Set(products.filter(p => p.category === name).map(p => p.subcategory).filter(Boolean))).sort();
      
      return {
        name: name,
        imageUrl: config?.imageUrl || '',
        subcategories: subcats
      };
    });
  }, [products, allCategoryConfigs]);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  if (isLoading && products.length === 0) {
    return (
      <div className="bg-background min-h-screen pb-40">
        <div className="h-[55vh] md:h-[85vh] w-full bg-black/5 animate-pulse" />
        <div className="px-4 py-8 grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-black/5 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="px-4 space-y-4">
          <div className="h-4 w-32 bg-black/5 animate-pulse" />
          <div className="grid grid-cols-2 gap-0 border-t border-l border-[#e5e5e5]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-black/5 animate-pulse border-r border-b border-[#e5e5e5]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F4F0] min-h-screen pb-40">
      {/* Immersive Gallery Hero Section (Mockup-style) */}
      <section ref={heroRef} className="relative px-4 pt-4 mb-10">
        <div className="relative h-[65vh] md:h-[75vh] w-full rounded-2xl overflow-hidden shadow-sm group">
          {/* Main Slide/Fade Gallery with AnimatePresence */}
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentGalleryIndex}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing touch-pan-y"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(event, info) => {
                  const swipeThreshold = 50;
                  if (info.offset.x < -swipeThreshold) {
                    setIsAutoPlay(false);
                    handleNext();
                  } else if (info.offset.x > swipeThreshold) {
                    setIsAutoPlay(false);
                    handlePrev();
                  }
                }}
              >
                <img 
                  src={
                    (galleryImages && galleryImages.length > 0)
                      ? galleryImages[currentGalleryIndex]?.url 
                      : [
                          "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=80",
                          "https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=1200&q=80",
                          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80"
                        ][currentGalleryIndex % 3]
                  } 
                  alt="Gallery Slide" 
                  className="w-full h-full object-cover brightness-[0.93] contrast-[1.02] pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Elegant vignette/gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />
          </div>

          {/* Bullet dots/indicators of slides */}
          <div className="absolute bottom-6 right-8 z-20 flex gap-1.5">
            {Array.from({ length: Math.max(galleryImages.length, 3) }).map((_, idx) => {
              const isActive = currentGalleryIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    triggerHaptic('light');
                    setIsAutoPlay(false); // Switch to manual when clicking indicator
                    setCurrentGalleryIndex(idx);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    isActive ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                  )}
                />
              );
            })}
          </div>

          {/* Texts overlay matching mockup exactly */}
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 flex flex-col items-start text-white space-y-2 z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F7F4F0]/80">
              NEW DROP
            </span>
            <h2 className="text-3xl sm:text-5xl font-brand font-black uppercase tracking-[0.1em] text-[#F7F4F0]">
              LINEN SHIRTS
            </h2>
            <p className="font-serif italic text-sm sm:text-base text-[#F7F4F0]/90">
              Crafted for Breathability.
            </p>
            <div className="pt-4">
              <Link 
                to="/shop" 
                onClick={() => triggerHaptic('medium')}
                className="inline-block bg-black hover:bg-neutral-900 text-[#F7F4F0] text-[9px] font-black uppercase tracking-widest px-8 py-3.5 rounded-sm transition-all shadow-md active:scale-95"
              >
                EXPLORE NOW
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Category Navigation */}
      <section className="mb-10">
        <CategoryQuickNav categories={quickNavCategories} isAdmin={isAdmin} />
      </section>

      {/* Search Results Or Curated Page Contents */}
      {searchQuery ? (
        <section className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-6 mb-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Search className="w-4 h-4 text-black/30" />
                <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">Search Results</h2>
              </div>
              <p className="text-[9px] font-bold text-black/35 uppercase tracking-[0.1em] pl-7">
                Showing {filteredAndSortedProducts.length} items for "{searchQuery}"
              </p>
            </div>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-black/5 hover:bg-black text-[10px] font-black text-black/40 hover:text-white uppercase tracking-widest rounded-full transition-all border border-black/5"
            >
              Clear Results
            </button>
          </motion.div>
          
          {filteredAndSortedProducts.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-l border-[#e5e5e5]"
            >
              {filteredAndSortedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="bg-white"
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 px-4 bg-black/[0.02] mx-4 rounded-3xl border border-dashed border-black/10"
            >
              <div className="w-14 h-14 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-black/30" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2 text-black">No Matches Found</h3>
              <p className="text-black/40 font-semibold uppercase tracking-widest text-[9px] max-w-xs mx-auto mb-6">
                We couldn't find any products matching your search for "{searchQuery}".
              </p>
              <button 
                onClick={() => setSearchQuery('')}
                className="bg-black text-white text-[9px] font-black px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition-all"
              >
                BROWSE ALL PRODUCTS
              </button>
            </motion.div>
          )}
        </section>
      ) : (
        <>
          {/* NEW ARRIVALS Section with Horizontal Scroll exactly matches mockup */}
          <section className="mb-12 px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black text-black uppercase tracking-[0.3em]">
                NEW ARRIVALS
              </h2>
              <Link 
                to="/shop"
                className="text-[9px] font-black text-black/35 hover:text-black uppercase tracking-widest transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Scrollable list of first arrivals */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory -mx-6 px-6">
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="min-w-[190px] w-[190px] snap-start bg-white rounded-2xl p-2 border border-neutral-200/40 shadow-sm relative shrink-0">
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          </section>

          {/* Curated Spotlight: CRAFTED FOR YOU (Mockup card) */}
          <section className="mb-12 px-4">
            <div className="relative rounded-2xl overflow-hidden h-36 border border-neutral-200/20 shadow-sm">
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=800&q=85" 
                  alt="Spotlight texture" 
                  className="w-full h-full object-cover brightness-[0.9] saturate-[0.8]"
                />
                <div className="absolute inset-0 bg-black/15" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 space-y-1 z-10">
                <span className="text-[8px] font-black tracking-[0.3em] text-white/70 uppercase">
                  CRAFTED FOR YOU
                </span>
                <p className="font-serif italic text-xs text-white/95">
                  Timeless pieces. Naturally made.
                </p>
                <div className="pt-2">
                  <Link 
                    to="/shop"
                    onClick={() => triggerHaptic('light')}
                    className="inline-block bg-white hover:bg-neutral-100 text-[#111] text-[7.5px] font-black uppercase tracking-widest px-6 py-2 rounded-sm transition-all active:scale-95"
                  >
                    SHOP COLLECTION
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Core Perks row: 4 neat minimalist blocks matching image */}
          <section className="mb-14 px-6 border-y border-neutral-200/50 py-8 bg-[#FAF8F5]">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#111]/5 flex items-center justify-center text-[#C5A059]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-black leading-tight max-w-[70px]">
                  PREMIUM QUALITY
                </span>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#111]/5 flex items-center justify-center text-[#C5A059]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-black leading-tight max-w-[70px]">
                  NATURAL FABRICS
                </span>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#111]/5 flex items-center justify-center text-[#C5A059]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.248.58 1.8L16.8 12.98h-.001l-.001.001M16.8 12.98l1.518 4.674c.3.922-.755 1.688-1.538 1.11L13 15.82a1 1 0 00-1.176 0l-3.953 2.871c-.783.57-1.838-.197-1.538-1.11L7.86 12.98l-3.111-2.262c-.78-.553-.381-1.8.58-1.8h4.907a1 1 0 00.95-.69L11.049 2.927z" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-black leading-tight max-w-[70px]">
                  TIMELESS DESIGNS
                </span>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#111]/5 flex items-center justify-center text-[#C5A059]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                  </svg>
                </div>
                <span className="text-[7.5px] font-black uppercase tracking-wider text-black leading-tight max-w-[70px]">
                  EASY RETURNS
                </span>
              </div>
            </div>
          </section>

          {/* Dynamic Sections populated from Firebase */}
          {productsBySubcategory.map((group) => (
            <section key={group.title} className="mb-14 px-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black text-black uppercase tracking-[0.3em]">
                  {group.title}
                </h2>
                <Link 
                  to={`/shop?subcategory=${encodeURIComponent(group.title)}`}
                  className="text-[9px] font-black text-black/35 hover:text-black uppercase tracking-widest transition-colors"
                >
                  View All
                </Link>
              </div>
              
              <div className="grid grid-cols-2 gap-0 border-t border-l border-[#e5e5e5]">
                {group.products.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <BrandSignature variant="dark" className="mb-16 opacity-30" />
    </div>
  );
}
