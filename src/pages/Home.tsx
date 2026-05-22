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
    if (galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentGalleryIndex(prev => (prev + 1) % galleryImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [galleryImages.length, currentGalleryIndex]);

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
      const dataToCache = {
        gallery: galleryImages,
        products: products,
        subConfigs: subcategoryConfigs,
        catConfigs: allCategoryConfigs
      };
      localStorage.setItem('home_data_cache', JSON.stringify(dataToCache));
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
      
      setProducts(firestoreProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error in Home.tsx products listener:", error);
      // Fallback if index is missing
      if (error.code === 'failed-precondition') {
        const fallbackQ = query(collection(db, 'products'), limit(40));
        onSnapshot(fallbackQ, (snapshot) => {
          const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setProducts(products as any);
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
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-black/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-40">
      {/* Gallery Hero Section */}
      <section ref={heroRef} className="relative mb-12" style={{ perspective: '1500px' }}>
        <div className="relative h-[55vh] md:h-[85vh] w-full rounded-none overflow-hidden group shadow-2xl shadow-black/10">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentGalleryIndex}
              initial={{ clipPath: 'inset(0 0 0 100%)', x: '10%', opacity: 0 }}
              animate={{ clipPath: 'inset(0 0 0 0%)', x: 0, opacity: 1 }}
              exit={{ clipPath: 'inset(0 100% 0 0%)', x: '-10%', opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                const swipeSpeed = Math.abs(velocity.x);
                const swipeDistance = offset.x;
                
                if (swipeDistance < -50 || (swipeSpeed > 500 && swipeDistance < 0)) {
                  handleNext();
                } else if (swipeDistance > 50 || (swipeSpeed > 500 && swipeDistance > 0)) {
                  handlePrev();
                }
              }}
              style={{ 
                scale: heroScale, 
                opacity: heroOpacity,
                rotateX: heroRotateX,
                transformOrigin: 'top center'
              }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <img 
                src={galleryImages[currentGalleryIndex]?.url || "https://picsum.photos/seed/fashion/800/1200"} 
                alt="Hero" 
                className="w-full h-full object-cover transform scale-110"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </AnimatePresence>

                {/* Stable 3D Shirt Button CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              {/* The Bubble Button */}
              <div className="relative group/btn w-32 h-32 md:w-64 md:h-64 flex items-center justify-center">
                {/* Outer Iridescent Glow */}
                <div className="absolute inset-[-10px] rounded-full bg-gradient-to-tr from-[#E8809B] via-[#6EBED6] to-[#B07DB8] opacity-30 blur-2xl animate-pulse" />
                
                {/* Shadow/Depth */}
                <div className="absolute inset-0 rounded-full bg-black/40 blur-xl translate-y-10 scale-90" />
                
                {/* Button Body - Glossy Bubble Shell */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/80 via-white/10 to-transparent p-[3px] shadow-[0_30px_60px_rgba(0,0,0,0.5),inset_0_4px_10px_rgba(255,255,255,0.7)] backdrop-blur-[2px] flex items-center justify-center overflow-hidden relative">
                  {/* Iridescent Layer */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,_#E8809B,_#6EBED6,_#B07DB8,_#D9CD64,_#6EBED6,_#E8809B)] opacity-60 mix-blend-color-dodge animate-[spin_15s_linear_infinite]" />
                  
                  {/* High Gloss Highlights */}
                  <div className="absolute top-[10%] left-[20%] w-[40%] h-[20%] bg-white/60 blur-xl rounded-full rotate-[-35deg]" />
                  <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[15%] bg-white/20 blur-lg rounded-full rotate-[145deg]" />

                  {/* Button Face - Transparent Logo Cutout */}
                  <div 
                    className="w-[90%] h-[90%] rounded-full bg-black/5 backdrop-blur-[4px] shadow-[inset_0_10px_30px_rgba(0,0,0,0.4),inset_0_-10px_30px_rgba(255,255,255,0.2)] relative"
                    style={{ 
                      WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png'), radial-gradient(circle, black 100%, black 100%)",
                      maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png'), radial-gradient(circle, black 100%, black 100%)",
                      WebkitMaskComposite: "destination-out",
                      maskComposite: "exclude",
                      WebkitMaskSize: "65%, 100%",
                      maskSize: "65%, 100%",
                      WebkitMaskRepeat: "no-repeat, no-repeat",
                      maskRepeat: "no-repeat, no-repeat",
                      WebkitMaskPosition: "center, center",
                      maskPosition: "center, center",
                    }}
                  >
                    {/* Shimmer effect inside the bubble shell */}
                    <div className="absolute inset-0 opacity-40 bg-gradient-to-tr from-transparent via-white to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  </div>
                </div>
              </div>

              {/* Text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="flex flex-col items-center"
              >
                <span className="text-white font-black text-xl md:text-3xl uppercase tracking-[0.2em] drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] border-b-2 border-white pb-1">
                  Trial Room
                </span>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Persistent Link overlay */}
          <Link 
            to="/trial-room"
            className="absolute inset-0 z-40"
          />


          {/* Persistent Hero Overlay UI - Arrows removed for natural sliding */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Overlay empty as requested, using drag gestures for manual slide */}
          </div>
        </div>

          {/* Indicators - Premium look */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    triggerHaptic('light');
                    setCurrentGalleryIndex(i);
                  }}
                  className={cn(
                    "h-1.5 transition-all duration-500 rounded-full shadow-inner",
                    currentGalleryIndex === i ? "w-10 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
      </section>

      {/* Quick Category Navigation */}
      <CategoryQuickNav categories={quickNavCategories} isAdmin={isAdmin} />

      {/* Search Results / Featured Subcategory Sections */}
      {searchQuery ? (
        <section className="mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 mb-8"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Search className="w-4 h-4 text-black/30" />
                <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">Search Results</h2>
              </div>
              <p className="text-[9px] font-bold text-black/30 uppercase tracking-[0.1em] pl-7">
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
              className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-[#e5e5e5]"
            >
              {filteredAndSortedProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className={cn(
                    "bg-white border-l border-b border-[#e5e5e5]",
                    idx % 2 === 0 ? "md:border-l-0" : ""
                  )}
                >
                  <ProductCard {...product} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 bg-black/5 rounded-[40px] border-2 border-dashed border-black/10"
            >
              <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-black/20" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">No Matches Found</h3>
              <p className="text-black/40 font-bold uppercase tracking-widest text-xs max-w-xs mx-auto mb-8">
                We couldn't find any products matching your search for "{searchQuery}".
              </p>
              <button 
                onClick={() => setSearchQuery('')}
                className="bg-black text-white text-[10px] font-black px-8 py-3 rounded-full hover:scale-105 active:scale-95 transition-all"
              >
                BROWSE ALL PRODUCTS
              </button>
            </motion.div>
          )}

          {searchQuery && filteredAndSortedProducts.length > 0 && (
            <div className="px-4">
              <EndOfFeedSuggestions 
                allCategories={quickNavCategories.map(c => c.name)}
                allSubcategories={Array.from(new Set(products.map(p => p.subcategory).filter(Boolean)))}
                onSelectCategory={(cat) => {
                  setSearchQuery('');
                  const navigate = (window as any).navigation?.navigate || (() => window.location.href = `/shop?category=${cat}`);
                  window.location.href = `/shop?category=${cat}`;
                }}
                onSelectSubcategory={(sub) => {
                  setSearchQuery('');
                  window.location.href = `/shop?subcategory=${sub}`;
                }}
              />
            </div>
          )}
        </section>
      ) : (
        productsBySubcategory.map((group) => (
          <section key={group.title} className="mb-16">
            <div className="flex items-center justify-between px-4 mb-6">
              <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">{group.title}</h2>
              <Link 
                to={`/shop?subcategory=${encodeURIComponent(group.title)}`}
                className="text-[9px] font-bold text-black/30 uppercase tracking-[0.1em] flex items-center gap-1 hover:text-black transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-2 gap-0 border-t border-[#e5e5e5]"
            >
              {group.products.slice(0, 9).map((product, index) => {
                // Repeating pattern: 2 items side-by-side (1col each), then 1 item full-width (2cols)
                // Cycle of 3: [0: half, 1: half, 2: full]
                const cyclePos = index % 3;
                const isFullWidth = cyclePos === 2;
                
                return (
                  <motion.div
                    key={product.id}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className={cn(
                      "bg-white relative overflow-hidden group/item border-b border-[#e5e5e5]",
                      isFullWidth ? "col-span-2" : "col-span-1",
                      !isFullWidth && cyclePos === 1 ? "border-l border-[#e5e5e5]" : ""
                    )}
                  >
                    <div className="h-full">
                      <ProductCard 
                        {...product} 
                        aspectRatio={isFullWidth ? 'square' : 'portrait'} 
                        priority={index === 0} 
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {group.products.length > 8 && (
              <div className="mt-12 flex justify-center px-4">
                <Link 
                  to={`/shop?subcategory=${encodeURIComponent(group.title)}`}
                  className="group flex items-center gap-4 text-black font-black text-[10px] uppercase tracking-[0.3em] transition-all"
                >
                  <span>Explore All {group.title}</span>
                  <div className="w-12 h-[1px] bg-black/10 group-hover:w-20 group-hover:bg-[#C5A059] transition-all" />
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            )}
          </section>
        ))
      )}

      <BrandSignature variant="dark" className="mb-20 opacity-30" />
    </div>
  );
}
