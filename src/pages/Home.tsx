import { useState, useMemo, useEffect, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import { toast } from 'sonner';
import { ScrollHighlightText } from '@/components/ScrollHighlightText';
import { DEFAULT_SITE_CONFIG } from '@/lib/AuthContext';
import { collection, onSnapshot, query, orderBy, limit, getDocs, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Sparkles, TrendingUp, Zap, Heart, Search, Mic, Image as LucideImage, ChevronRight, ChevronLeft, X, Percent, Maximize2 } from 'lucide-react';
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
import { safeLocalStorage } from '@/lib/storage';

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

// Helper functions to prune cache size and avoid QuotaExceededError in localStorage
const pruneProductsForCache = (prodList: any[]) => {
  if (!Array.isArray(prodList)) return [];
  return prodList.map(p => ({
    id: p.id || '',
    name: p.name || '',
    price: p.price || 0,
    originalPrice: p.originalPrice || 0,
    image: p.image || '',
    images: Array.isArray(p.images) ? p.images.slice(0, 2) : [],
    category: p.category || '',
    subcategory: p.subcategory || '',
    isNew: !!p.isNew,
    isUpcoming: !!p.isUpcoming,
    isBestSeller: !!p.isBestSeller,
    isTribeExclusive: !!p.isTribeExclusive,
    discount: p.discount || 0,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    videoUrl: p.videoUrl || '',
    rating: p.rating || 0,
    reviewsCount: p.reviewsCount || 0,
    isPremium: !!p.isPremium
  }));
};

const pruneCategoryConfigs = (catList: any[]) => {
  if (!Array.isArray(catList)) return [];
  return catList.map(c => ({
    id: c.id || '',
    name: c.name || '',
    imageUrl: c.imageUrl || '',
    order: c.order || 0,
    showOnHome: !!c.showOnHome,
    subtitle: c.subtitle || ''
  }));
};

const pruneSubcategoryConfigs = (subList: any[]) => {
  if (!Array.isArray(subList)) return [];
  return subList.map(s => ({
    id: s.id || '',
    name: s.name || '',
    categoryName: s.categoryName || ''
  }));
};

const pruneGalleryImages = (galleryList: any[]) => {
  if (!Array.isArray(galleryList)) return [];
  return galleryList.map(g => ({
    id: g.id || '',
    url: g.url || '',
    title: g.title || '',
    description: g.description || '',
    link: g.link || '',
    linkText: g.linkText || ''
  }));
};

const DEFAULT_TRIBE_IMAGES = [
  { id: 'def1', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80', caption: 'The Minimalist Vibe' },
  { id: 'def2', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80', caption: 'Streetwear Pioneers' },
  { id: 'def3', url: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=600&q=80', caption: 'Casual Aesthetic' },
  { id: 'def4', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', caption: 'Classic Tailoring' },
  { id: 'def5', url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80', caption: 'Elevated Loungewear' }
];

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Home() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { role, user, siteConfig } = useAuth();

  // Load home data cache synchronously for instantaneous rendering without layout shift or loaders
  const cachedHomeData = useMemo(() => {
    try {
      const cached = safeLocalStorage.getItem('home_data_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Error parsing home page cache on startup", e);
    }
    return null;
  }, []);

  const [products, setProducts] = useState<any[]>(() => cachedHomeData?.products || []);
  const [galleryImages, setGalleryImages] = useState<any[]>(() => cachedHomeData?.gallery || []);
  const [tribeGallery, setTribeGallery] = useState<any[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [allCategoryConfigs, setAllCategoryConfigs] = useState<any[]>(() => cachedHomeData?.catConfigs || []);
  const [subcategoryConfigs, setSubcategoryConfigs] = useState<any[]>(() => cachedHomeData?.subConfigs || []);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(() => !(cachedHomeData?.products?.length > 0));
  const { wishlist } = useWishlist();
  const [secondGallery, setSecondGallery] = useState<any>({
    imageUrl: "https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=800&q=85",
    title: "CRAFTED FOR YOU",
    subtitle: "Timeless pieces. Naturally made.",
    buttonText: "SHOP COLLECTION",
    linkType: "shop"
  });

  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.1]);
  const textParallax = useTransform(scrollY, [0, 500], [0, 150]);
  const titleParallax = useTransform(scrollY, [0, 500], [0, 100]);
  const searchParallax = useTransform(scrollY, [0, 500], [0, 50]);
  const heroRotateX = useTransform(scrollY, [0, 600], [0, 20]);

  const getSlidesCount = () => {
    return galleryImages.length > 0 ? galleryImages.length : 3;
  };

  // Auto-rotate gallery
  useEffect(() => {
    const count = getSlidesCount();
    if (count <= 1 || !isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrentGalleryIndex(prev => (prev + 1) % count);
    }, 5000);
    return () => clearInterval(interval);
  }, [galleryImages, currentGalleryIndex, isAutoPlay]);

  // Preload next gallery image
  useEffect(() => {
    const count = getSlidesCount();
    if (galleryImages.length > 1 && count > 1) {
      const nextIndex = (currentGalleryIndex + 1) % count;
      if (galleryImages[nextIndex]) {
        const img = new Image();
        img.src = galleryImages[nextIndex].url;
      }
    }
  }, [currentGalleryIndex, galleryImages]);

  // Sync cache when data changes with pruned structures to prevent QuotaExceededErrors
  useEffect(() => {
    if (products.length > 0) {
      try {
        const dataToCache = {
          gallery: pruneGalleryImages(galleryImages),
          products: pruneProductsForCache(products),
          subConfigs: pruneSubcategoryConfigs(subcategoryConfigs),
          catConfigs: pruneCategoryConfigs(allCategoryConfigs)
        };
        safeLocalStorage.setItem('home_data_cache', JSON.stringify(dataToCache));
      } catch (error) {
        console.warn("Storage quota exceeded or error occurred while updating home cache:", error);
      }
    }
  }, [galleryImages, products, subcategoryConfigs, allCategoryConfigs]);

  const handleNext = () => {
    const count = getSlidesCount();
    if (count <= 1) return;
    triggerHaptic('medium');
    setCurrentGalleryIndex(prev => (prev + 1) % count);
  };

  const handlePrev = () => {
    const count = getSlidesCount();
    if (count <= 1) return;
    triggerHaptic('medium');
    setCurrentGalleryIndex(prev => (prev === 0 ? count - 1 : prev - 1));
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
    const q = query(collection(db, 'tribe_promo_gallery'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTribeGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Tribe Gallery Sync Error:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'configs', 'second_gallery'), (docSnap) => {
      if (docSnap.exists()) {
        setSecondGallery(docSnap.data());
      }
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

  const bestSellers = useMemo(() => {
    return products.filter(p => !!p.isBestSeller);
  }, [products]);

  const discountedProducts = useMemo(() => {
    return products.filter(p => {
      const d = Number(p.discount) || 0;
      const op = Number(p.originalPrice) || 0;
      const pr = Number(p.price) || 0;
      return d > 0 || (op > pr && pr > 0 && op > 0);
    }).sort((a, b) => {
      const discA = Number(a.discount) || (a.originalPrice && a.price ? Math.round(((a.originalPrice - a.price) / a.originalPrice) * 100) : 0);
      const discB = Number(b.discount) || (b.originalPrice && b.price ? Math.round(((b.originalPrice - b.price) / b.originalPrice) * 100) : 0);
      return discB - discA;
    });
  }, [products]);

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
          <div className="grid grid-cols-2 gap-0 border-t border-[#e5e5e5]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-black/5 animate-pulse border-r border-b border-[#e5e5e5] even:border-r-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-40 transition-colors duration-300 animate-fade-in"
      style={{ backgroundColor: siteConfig?.homeBackgroundColor || '#F7F4F0' }}
    >
      {/* Immersive Gallery Hero Section (Edge to Edge) */}
      <section ref={heroRef} className="relative w-full mb-10">
        <div className="relative h-[65vh] md:h-[75vh] w-full overflow-hidden shadow-sm group">
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
            {Array.from({ length: getSlidesCount() }).map((_, idx) => {
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
          {(() => {
            const currentSlide = galleryImages && galleryImages[currentGalleryIndex];
            const slideCategory = currentSlide?.category && currentSlide.category !== 'NONE' 
              ? currentSlide.category 
              : "NEW DROP";
            const slideCaption = currentSlide?.caption || (
              currentGalleryIndex === 0 ? "LINEN SHIRTS" :
              currentGalleryIndex === 1 ? "ESSENTIAL LINEN" :
              "PREMIUM APPAREL"
            );
            const slideSubcategory = currentSlide?.subcategory 
              ? `Collection: ${currentSlide.subcategory}`
              : (siteConfig?.heroSubtitle || "Crafted for Breathability.");

            const targetCategory = currentSlide?.category;
            const targetSubcategory = currentSlide?.subcategory;

            let exploreUrl = '/shop';
            if (targetCategory && targetCategory !== 'NONE') {
              exploreUrl = `/shop?category=${encodeURIComponent(targetCategory)}`;
              if (targetSubcategory) {
                exploreUrl += `&subcategory=${encodeURIComponent(targetSubcategory)}`;
              }
            }

            return (
              <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 flex flex-col items-start text-white space-y-2 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none">
                <span 
                  className="text-[10px] font-black uppercase tracking-[0.3em]"
                  style={{ color: `${siteConfig?.homeBackgroundColor || '#F7F4F0'}CC` }}
                >
                  {slideCategory}
                </span>
                <h2 
                  className="text-3xl sm:text-5xl font-brand font-black uppercase tracking-[0.1em]"
                  style={{ color: siteConfig?.homeBackgroundColor || '#F7F4F0' }}
                >
                  {slideCaption}
                </h2>
                <p 
                  className="font-serif italic text-sm sm:text-base text-white/95"
                  style={{ color: `${siteConfig?.homeBackgroundColor || '#F7F4F0'}E6` }}
                >
                  {slideSubcategory}
                </p>
                <div className="pt-4 pointer-events-auto">
                  <Link 
                    to={exploreUrl} 
                    onClick={() => triggerHaptic('medium')}
                    className="inline-block bg-black hover:bg-neutral-900 text-[9px] font-black uppercase tracking-widest px-8 py-3.5 rounded-sm transition-all shadow-md active:scale-95 animate-pulse-slow"
                    style={{ color: siteConfig?.homeBackgroundColor || '#F7F4F0' }}
                  >
                    {siteConfig?.heroButtonText || "EXPLORE NOW"}
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Quick Category Navigation */}
      <section className="mb-3">
        <CategoryQuickNav categories={quickNavCategories} isAdmin={isAdmin} />
      </section>

      {/* Search Results Or Curated Page Contents */}
      {searchQuery ? (
        <section className="mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-5 h-5 text-black/40" />
                <h2 className="text-2xl font-brand font-semibold tracking-tight text-neutral-900">Search Results</h2>
              </div>
              <p className="text-xs text-neutral-500 pl-7">
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
              className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-[#e5e5e5] [&>*:nth-child(2n)_.group]:border-r-0 md:[&>*:nth-child(2n)_.group]:border-r-[0.5px] md:[&>*:nth-child(4n)_.group]:border-r-0"
            >
              {filteredAndSortedProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="bg-white"
                >
                  <ProductCard {...product} priority={index < 4} />
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
          <section className="mb-7">
            <div className="flex items-center justify-between mb-3.5 px-4">
              <h2 className="text-2xl font-brand font-semibold tracking-tight text-neutral-900">
                New Arrivals
              </h2>
              <Link 
                to="/shop"
                className="text-xs font-brand font-medium text-neutral-500 hover:text-black transition-colors"
              >
                View All
              </Link>
            </div>

            {/* Scrollable list of first arrivals */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory px-4">
              {products.slice(0, 6).map((product, index) => (
                <div key={product.id} className="min-w-[190px] w-[190px] snap-start bg-white rounded-2xl p-2 border border-neutral-200/40 shadow-sm relative shrink-0">
                  <ProductCard {...product} priority={index < 3} />
                </div>
              ))}
            </div>
          </section>

          {/* THE GALLERY PORT SECTION */}
          <section className="mb-7 animate-fade-in">
            <div className="flex flex-col mb-3.5 px-4 select-none">
              <span className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.2em] leading-none mb-1.5">Interactive Lookbook</span>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-brand font-semibold tracking-tight text-neutral-900 uppercase leading-none">
                  Gallery Port
                </h2>
                <span className="text-[8px] font-black uppercase bg-[#C5A059] text-black px-2.5 py-1 rounded-full tracking-widest leading-none">
                  Live View
                </span>
              </div>
            </div>

            {/* Horizontally scrolling gallery grid with elegant lookbook frames */}
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory px-4">
              {(galleryImages.length > 0 ? galleryImages : [
                { url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80", caption: "Premium Wool Blend Silhouette", category: "SILHOUETTE 01" },
                { url: "https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=600&q=80", caption: "Raw Stonewashed Softness", category: "STONEWASH 02" },
                { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80", caption: "Textured Knit Weaves", category: "TEXTURES 03" }
              ]).map((img, idx) => (
                <div 
                  key={img.id || idx}
                  onClick={() => {
                    triggerHaptic('medium');
                    setLightboxIndex(idx);
                  }}
                  className="min-w-[240px] w-[240px] aspect-[4/5] snap-start bg-neutral-950 rounded-[32px] p-1 border border-neutral-200/50 relative shrink-0 overflow-hidden group shadow-sm hover:shadow-md cursor-zoom-in transition-all duration-300"
                >
                  <div className="absolute inset-1.5 overflow-hidden rounded-[26px] h-[calc(100%-12px)]">
                    <img 
                      src={img.url} 
                      alt={img.caption || "Lookbook shot"} 
                      className="absolute inset-x-0 top-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105 brightness-[0.88] group-hover:brightness-95"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    
                    {/* Top Right Zoom Badge */}
                    <div className="absolute top-3.5 right-3.5 bg-white/10 hover:bg-white/20 border border-white/20 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      <span className="text-[7.5px] font-black uppercase tracking-[0.25em] text-[#C5A059] mb-1 block">
                        {img.category && img.category !== 'NONE' ? img.category : "DEBUT CONCEPT"}
                      </span>
                      <h3 className="text-white text-xs font-brand font-black uppercase tracking-tight leading-tight mb-1">
                        {img.caption || "LOOKBOOK FRAME"}
                      </h3>
                      <p className="text-white/45 text-[8px] uppercase tracking-widest font-mono">
                        View Frame &bull; Open Lightbox
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* DISCOUNT GALLERY Section with compact Horizontal Scroll */}
          {discountedProducts.length > 0 && (
            <section className="mb-7 animate-fade-in">
              <div className="flex items-center justify-between mb-3.5 px-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-rose-500" />
                  <div>
                    <h2 className="text-xl font-brand font-semibold tracking-tight text-neutral-900 leading-none">
                      {siteConfig?.discountGalleryTitle || "Exclusive Deals"}
                    </h2>
                    <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-[0.15em] mt-1">
                      {siteConfig?.discountGallerySubtitle || "Limited Time Offers"}
                    </p>
                  </div>
                </div>
                <Link 
                  to="/shop?sort=discount"
                  className="text-xs font-brand font-medium text-neutral-200 hover:text-black transition-colors"
                  style={{ color: '#C5A059' }}
                >
                  View Deals
                </Link>
              </div>

              {/* Scrollable list of discounted items, compact/small size */}
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory px-4">
                {discountedProducts.slice(0, 8).map((product, index) => (
                  <div key={product.id} className="min-w-[145px] w-[145px] snap-start bg-white rounded-2xl p-1.5 border border-neutral-200/40 shadow-sm relative shrink-0">
                    <ProductCard {...product} priority={index < 3} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* BEST SELLERS SECTION */}
          <section className="mb-7">
            <div className="flex items-center justify-between mb-3.5 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h2 className="text-2xl font-brand font-semibold tracking-tight text-neutral-900">
                  Best Sellers
                </h2>
              </div>
            </div>

            {bestSellers.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory px-4">
                {bestSellers.map((product, index) => (
                  <div key={product.id} className="min-w-[190px] w-[190px] snap-start bg-white rounded-2xl p-2 border border-neutral-200/40 shadow-sm relative shrink-0">
                    <ProductCard {...product} priority={index < 3} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-4 bg-white/60 mx-4 rounded-3xl border-2 border-dashed border-neutral-300">
                <div className="w-14 h-14 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-neutral-800">No Best Sellers Promoted</h3>
                <p className="text-neutral-500 uppercase tracking-widest text-[9px] max-w-xs mx-auto mb-6">
                  Admins can push any product to Best Sellers from the seller inventory dashboard.
                </p>
                {isAdmin && (
                  <Link 
                    to="/manage-products"
                    className="inline-block bg-black hover:bg-neutral-900 text-white text-[9.5px] font-black uppercase tracking-widest px-8 py-3.5 rounded-sm transition-all shadow-md active:scale-95"
                  >
                    Go To Manage Inventory
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Curated Spotlight / Offers Card (Moved under Best Sellers and made BIG photo size) */}
          <section className="mb-8 px-4">
            <div className="relative rounded-3xl overflow-hidden h-[450px] md:h-[500px] border border-neutral-200/25 shadow-md">
              <div className="absolute inset-0">
                <img 
                  src={secondGallery.imageUrl || "https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=800&q=85"} 
                  alt={secondGallery.title || "Spotlight texture"} 
                  className="w-full h-full object-cover select-none transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end text-center p-8 pb-10 space-y-3.5 z-10">
                <span className="text-[9px] font-black tracking-[0.4em] text-[#C5A059] uppercase border-b border-[#C5A059]/30 pb-1.5 mb-1">
                  {secondGallery.title || 'CRAFTED FOR YOU'}
                </span>
                <h3 className="font-serif italic text-[22px] text-white font-medium max-w-[280px] leading-relaxed drop-shadow-md">
                  {secondGallery.subtitle || 'Timeless pieces. Naturally made.'}
                </h3>
                <div className="pt-2">
                  <a 
                    href={/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'https://apps.apple.com' : 'https://play.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerHaptic('light')}
                    className="inline-block bg-[#C5A059] hover:bg-[#b08e50] text-black font-brand font-bold text-[9.5px] uppercase tracking-[0.25em] px-8 py-4 rounded-full transition-all duration-300 shadow-xl active:scale-95"
                  >
                    {secondGallery.buttonText || 'DOWNLOAD APP'}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Join Tribe Promotion Gallery Section */}
          <section className="mb-8">
            <div className="px-4 mb-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1.5 select-none">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-amber-100 text-[#C5A059] px-2.5 py-1 rounded-full w-fit">
                    Join Tribe
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-black text-white px-2.5 py-1 rounded-full w-fit">
                    ₹299/YR
                  </span>
                </div>
                <h2 className="text-2xl font-brand font-semibold tracking-tight text-neutral-900 uppercase">
                  Our Community Aesthetic
                </h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                  Connect & vibe with the Geometric Crew 
                </p>
              </div>
              <Link 
                to="/tribe"
                className="text-xs font-black uppercase tracking-wider text-[#C5A059] hover:text-black hover:underline transition-all"
              >
                Join Tribe Now &rarr;
              </Link>
            </div>

            {/* Horizontally scrolling gallery stream */}
            <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory px-4">
              {(tribeGallery.length > 0 ? tribeGallery : DEFAULT_TRIBE_IMAGES).map((img) => (
                <div 
                  key={img.id} 
                  className="min-w-[220px] w-[220px] aspect-[4/5] snap-start bg-neutral-900 rounded-[32px] p-4 relative shrink-0 overflow-hidden group shadow-md hover:shadow-lg transition-transform duration-500"
                >
                  <img 
                    src={img.url} 
                    alt={img.caption || "Community highlight"} 
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.6] group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  {/* Glass Card Caption Badge */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left">
                    <p className="text-[8px] font-black uppercase tracking-widest text-amber-300 mb-0.5">
                      TRIBE VIBE
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-white leading-tight truncate">
                      {img.caption || "Lifestyle Shot"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Golden Promotion Feature Card with real member actions on click */}
            <div className="mx-4 mt-2 bg-[#FAF8F5] text-black p-8 rounded-[40px] border-2 border-[#C5A059]/30 relative overflow-hidden flex flex-col items-center text-center shadow-sm">
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-[#C5A059]/10 rounded-full blur-3xl" />
              <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-[#C5A059]/10 rounded-full blur-3xl" />
              
              <h3 className="text-xl font-heading font-black text-black uppercase tracking-tight mb-2">
                Save an Extra 10% on Every Single Item
              </h3>
              <p className="text-neutral-500 font-medium text-xs max-w-md mx-auto mb-6 leading-relaxed">
                Tribe members skip standard shipping fees, receive immediate 24h Early Access to all drop collections, and score limited-edition designs.
              </p>
              
              <Link 
                to="/tribe"
                onClick={() => triggerHaptic('medium')}
                className="bg-black text-white font-brand font-black text-xs uppercase tracking-[0.2em] px-10 py-4 rounded-full hover:scale-105 hover:bg-[#C5A059] hover:text-black transition-all shadow-md active:scale-95"
              >
                JOIN THE TRIBE &bull; ₹299/YR
              </Link>
            </div>

            {/* Premium Coupon Display Section */}
            <div className="mx-4 mt-6 bg-white/40 border border-[#C5A059]/10 rounded-[36px] p-6 text-center select-none backdrop-blur-sm animate-fade-in relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#C5A059] mb-2">Exclusive Member Coupons</p>
              <h4 className="text-sm font-brand font-black text-black uppercase tracking-tight mb-4">
                Unlock Flat Savings at Checkout
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { code: 'TRIBE10', label: '10% OFF EVERYTHING', sub: 'Tribe exclusive discount coupon', min: 'No min order' },
                  { code: 'WELCOME250', label: '₹250 FLAT DISCOUNT', sub: 'Valid on first regal look orders', min: 'Above ₹1,499' },
                  { code: 'FREESHIP', label: 'FREE EXPRESS SHIPPING', sub: 'Receive free premium packaging', min: 'Above ₹999' }
                ].map((coupon) => (
                  <div 
                    key={coupon.code} 
                    className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-white border border-dashed border-[#C5A059]/30 rounded-2xl relative overflow-hidden active:scale-[0.98] transition-transform duration-300 gap-3"
                  >
                    {/* Decorative circular notch left & right */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 bg-[#FAF8F5] border-r border-[#C5A059]/10 rounded-full hidden sm:block" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2.5 w-5 h-5 bg-[#FAF8F5] border-l border-[#C5A059]/10 rounded-full hidden sm:block" />

                    <div className="sm:pl-4 text-center sm:text-left">
                      <p className="text-[11px] font-black text-black tracking-tight uppercase">{coupon.label}</p>
                      <p className="text-[8.5px] font-black text-[#C5A059] mt-0.5 uppercase tracking-wide">{coupon.sub} &bull; {coupon.min}</p>
                    </div>
                    
                    <div className="sm:pr-4 flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
                      <span className="font-mono text-[9px] font-black text-white bg-black px-2.5 py-1.5 rounded-lg select-all tracking-wider">
                        {coupon.code}
                      </span>
                      <button 
                        onClick={() => {
                          triggerHaptic('light');
                          navigator.clipboard.writeText(coupon.code);
                          toast.success(`Coupon "${coupon.code}" copied! Apply at Checkout.`);
                        }}
                        className="text-[9px] font-black text-black hover:bg-neutral-100 transition-colors uppercase tracking-widest px-3 py-1.5 rounded-lg border border-black/10 bg-white"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Dynamic subcategory sections removed as per user request */}
          <ScrollHighlightText text={siteConfig?.aboutText || DEFAULT_SITE_CONFIG.aboutText || ""} />
        </>
      )}

      {/* High-fidelity full-view Lightbox Modal Portal for Gallery Port lookbook shots */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-950/98 z-[100] flex flex-col justify-between items-center p-6 backdrop-blur-lg"
          >
            {/* Elegant Header Control Panel */}
            <div className="w-full max-w-lg flex justify-between items-center text-white/50 select-none pt-4">
              <span className="text-[9px] font-black tracking-[0.25em] uppercase font-mono text-[#C5A059]">
                LOOKBOARD PORT FRAME {lightboxIndex + 1} / {Math.max(galleryImages.length, 3)}
              </span>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setLightboxIndex(null);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport Box */}
            <div className="w-full max-w-lg flex-1 flex items-center justify-center relative my-4">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  const count = galleryImages.length > 0 ? galleryImages.length : 3;
                  setLightboxIndex(prev => prev === null ? 0 : (prev === 0 ? count - 1 : prev - 1));
                }}
                className="absolute left-2 z-[110] w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/10"
              >
                <ChevronLeft className="w-6 h-6 animate-pulse-slow" />
              </button>

              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.3 }}
                className="w-full max-h-[55vh] aspect-[4/5] rounded-[36px] overflow-hidden border border-white/10 shadow-2xl relative bg-neutral-900"
              >
                <img 
                  src={
                    (galleryImages.length > 0 ? galleryImages : [
                      { url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80" },
                      { url: "https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=600&q=80" },
                      { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80" }
                    ])[lightboxIndex]?.url
                  }
                  alt="Highres perspective frame"
                  className="w-full h-full object-cover mx-auto select-none rounded-[36px]"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <button 
                onClick={() => {
                  triggerHaptic('light');
                  const count = galleryImages.length > 0 ? galleryImages.length : 3;
                  setLightboxIndex(prev => prev === null ? 0 : (prev + 1) % count);
                }}
                className="absolute right-2 z-[110] w-12 h-12 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 border border-white/10"
              >
                <ChevronRight className="w-6 h-6 animate-pulse-slow" />
              </button>
            </div>

            {/* Bottom Details Drawer */}
            <div className="w-full max-w-lg text-center pb-4 select-none space-y-1.5 px-4">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[#C5A059] bg-[#C5A059]/10 px-3.5 py-1 rounded-full border border-[#C5A059]/20 font-brand">
                {
                  (galleryImages.length > 0 ? galleryImages : [
                    { category: "SILHOUETTE 01" },
                    { category: "STONEWASH 02" },
                    { category: "TEXTURES 03" }
                  ])[lightboxIndex]?.category || "CONCEPT DEBUT"
                }
              </span>
              <h3 className="text-white text-sm font-brand font-black uppercase leading-tight mt-2.5">
                {
                  (galleryImages.length > 0 ? galleryImages : [
                    { caption: "Premium Wool Blend Silhouette" },
                    { caption: "Raw Stonewashed Softness" },
                    { caption: "Textured Knit Weaves" }
                  ])[lightboxIndex]?.caption || "Minimalist Frame"
                }
              </h3>
              <p className="text-white/40 text-[8px] uppercase tracking-[0.15em] leading-relaxed">
                Swipe or drag to explore other live perspective frames
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BrandSignature variant="dark" className="mb-16 opacity-30" />
    </div>
  );
}
