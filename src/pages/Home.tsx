import { useState, useMemo, useEffect, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, TrendingUp, Zap, Heart, Search, Mic, Image as LucideImage, ChevronRight, ChevronLeft } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { cn } from '@/lib/utils';
import AnimatedBrandName from '@/components/AnimatedBrandName';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';
import CategoryStrip from '@/components/CategoryStrip';
import CategoryQuickNav from '@/components/CategoryQuickNav';
import { useWishlist } from '@/lib/WishlistContext';
import { useSearch } from '@/lib/SearchContext';

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
  const [products, setProducts] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [allCategoryConfigs, setAllCategoryConfigs] = useState<any[]>([]);
  const [subcategoryConfigs, setSubcategoryConfigs] = useState<any[]>([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { wishlist } = useWishlist();

  // Auto-rotate gallery
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentGalleryIndex(prev => (prev + 1) % galleryImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [galleryImages.length]);

  useEffect(() => {
    // Fetch store gallery images
    const gQ = query(collection(db, 'store_gallery'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeGallery = onSnapshot(gQ, (snapshot) => {
      setGalleryImages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Gallery Error:", error);
    });

    return () => unsubscribeGallery();
  }, []);

  useEffect(() => {
    // Fetch all category configs
    const unsubscribeConfigs = onSnapshot(collection(db, 'category_configs'), (snapshot) => {
      const allConfigs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllCategoryConfigs(allConfigs);
      
      const homeConfigs = allConfigs
        .filter((c: any) => c.showOnHome)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCategoryConfigs(homeConfigs);
    });

    return () => unsubscribeConfigs();
  }, []);

  useEffect(() => {
    // Fetch all subcategory configs
    const unsubscribeSubConfigs = onSnapshot(collection(db, 'subcategory_configs'), (snapshot) => {
      const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubcategoryConfigs(configs);
    });

    return () => unsubscribeSubConfigs();
  }, []);

  useEffect(() => {
    // Fetch all products without orderBy to ensure we get everything even if createdAt is missing
    const q = query(collection(db, 'products'));
    console.log("Fetching products from Firestore (no orderBy)...");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Received snapshot with ${snapshot.size} products`);
      const firestoreProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Fallback for createdAt if missing
          createdAt: data.createdAt?.toDate?.() || new Date(0)
        };
      });
      
      // Sort client-side by createdAt desc
      firestoreProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log("Processed products:", firestoreProducts);
      setProducts(firestoreProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error in Home.tsx onSnapshot:", error);
      handleFirestoreError(error, OperationType.LIST, 'products');
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
    // Get unique subcategories from products
    const uniqueSubcats = Array.from(new Set(products.map(p => p.subcategory || 'General').filter(Boolean)));
    
    // Merge with configs
    const merged = uniqueSubcats.map(name => {
      const config = subcategoryConfigs.find(c => c.name === name);
      return {
        name,
        showOnHome: config?.showOnHome ?? true,
        order: config?.order ?? 999
      };
    });

    // Filter visible and sort
    const visibleSubcats = merged
      .filter(s => s.showOnHome)
      .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

    return visibleSubcats.map(group => ({
      title: group.name,
      products: products.filter(p => (p.subcategory || 'General') === group.name)
    })).filter(group => group.products.length > 0);
  }, [products, subcategoryConfigs]);

  const quickNavCategories = useMemo(() => {
    // Get unique categories from products
    const uniqueCategoryNames = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    
    return uniqueCategoryNames.map(name => {
      const config = allCategoryConfigs.find(c => c.name === name);
      return {
        name: name,
        imageUrl: config?.imageUrl || ''
      };
    });
  }, [products, allCategoryConfigs]);

  return (
    <div className="bg-background min-h-screen pb-40">
      {/* Gallery Hero Section */}
      <section className="relative mb-12">
        <div className="relative h-[75vh] w-full rounded-b-[48px] overflow-hidden group shadow-2xl shadow-black/10">
          <AnimatePresence mode="wait">
            <motion.div
              key={galleryImages[currentGalleryIndex]?.id || 'default'}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-10" />
              <img 
                src={galleryImages[currentGalleryIndex]?.url || "https://picsum.photos/seed/fashion/800/1200"} 
                alt="Hero" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              {/* Premium Search Overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="w-full max-w-md"
                >
                  <div className="bg-white/10 backdrop-blur-3xl rounded-[32px] p-2 border border-white/20 shadow-2xl">
                    <div className="relative flex items-center">
                      <Search className="absolute left-6 w-5 h-5 text-white/40" />
                      <input 
                        type="text"
                        placeholder="FIND YOUR VIBE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-16 pl-14 pr-6 bg-white/10 rounded-[24px] border-none outline-none text-white font-black text-sm uppercase tracking-[0.2em] placeholder:text-white/30 focus:bg-white/20 transition-all"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Caption - Moved higher or lower for better visibility */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="mt-8 text-center"
                >
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.5em] mb-2">
                    {galleryImages[currentGalleryIndex]?.caption || "ELEVATED ESSENTIALS"}
                  </p>
                  <h1 className="text-4xl font-black text-white uppercase tracking-[0.1em]">
                    {galleryImages[currentGalleryIndex]?.category || "NEW ARRIVALS"}
                  </h1>
                </motion.div>
              </div>

              {/* Link overlay but not on search */}
              <Link 
                to={`/shop?category=${encodeURIComponent(galleryImages[currentGalleryIndex]?.category || 'Linen')}`}
                className="absolute inset-x-0 bottom-0 top-[60%] z-10"
              />
            </motion.div>
          </AnimatePresence>

          {/* Indicators - Premium look */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
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
        </div>
      </section>

      {/* Quick Category Navigation */}
      <CategoryQuickNav categories={quickNavCategories} />

      {/* Featured Subcategory Strips */}
      {!searchQuery && productsBySubcategory.map((group) => (
        <CategoryStrip 
          key={group.title} 
          title={group.title} 
          products={group.products} 
        />
      ))}

      {/* Tribe Card */}
      <section className="px-4 mb-20">
        <Link to="/tribe">
          <div className="bg-black rounded-[40px] p-8 relative overflow-hidden shadow-xl shadow-black/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[#C5A059]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#C5A059]">Member Exclusive</span>
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                JOIN THE <br /> TRIBE
              </h2>
              <p className="text-white/80 text-sm font-bold mb-6">Unlock ₹299 flat discount on all orders.</p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">+2.4k members</span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <BrandSignature variant="dark" className="mb-20 opacity-30" />
    </div>
  );
}
