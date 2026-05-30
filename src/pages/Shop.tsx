import { useState, useEffect, useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy, limit, getDocs, where, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Filter, ChevronDown, SlidersHorizontal, Heart, Sparkles, TrendingUp, Star, RotateCcw, Search } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import BrandSignature from '@/components/BrandSignature';
import EndOfFeedSuggestions from '@/components/EndOfFeedSuggestions';
import { toast } from 'sonner';
import { useWishlist } from '@/lib/WishlistContext';
import { useSearch } from '@/lib/SearchContext';
import { useAuth } from '@/lib/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Edit2 } from 'lucide-react';
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
  toast.error(`Firestore Error (${operationType}): ${errInfo.error}`);
}

const getProductExtraDetails = (p: any) => {
  const nameL = (p.name || '').toLowerCase();
  const descL = (p.description || '').toLowerCase();
  
  // Pattern detection
  let pattern = p.pattern || 'Solid';
  if (nameL.includes('print') || descL.includes('print')) pattern = 'Printed';
  else if (nameL.includes('stripe') || descL.includes('stripe')) pattern = 'Striped';
  else if (nameL.includes('check') || descL.includes('check')) pattern = 'Checked';
  else if (nameL.includes('embroid') || descL.includes('embroid')) pattern = 'Embroidered';

  // Fabric detection
  let fabric = p.fabric || 'Cotton Blend';
  if (nameL.includes('linen') || descL.includes('linen')) fabric = 'Linen';
  else if (nameL.includes('denim') || descL.includes('denim') || nameL.includes('jean')) fabric = 'Denim';
  else if (nameL.includes('silk') || descL.includes('silk')) fabric = 'Silk';
  else if (nameL.includes('wool') || descL.includes('wool')) fabric = 'Wool';
  else if (nameL.includes('polyester') || descL.includes('polyester')) fabric = 'Polyester';

  // Discount calculation
  const discount = p.discount || (p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0);

  // Delivery Days
  const deliveryDays = p.deliveryDays || (p.id ? (p.id.charCodeAt(0) % 3) + 2 : 2);

  return { pattern, fabric, discount, deliveryDays };
};

const updateShopPageCache = (updates: { products?: any[]; configs?: any[] }) => {
  try {
    const cachedStr = safeLocalStorage.getItem('shop_page_cache');
    let currentData: any = { products: [], configs: [] };
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (parsed) {
          if (Array.isArray(parsed.products)) currentData.products = parsed.products;
          if (Array.isArray(parsed.configs)) currentData.configs = parsed.configs;
        }
      } catch (e) {}
    }
    
    const newData = {
      products: updates.products !== undefined ? updates.products : currentData.products,
      configs: updates.configs !== undefined ? updates.configs : currentData.configs
    };
    
    safeLocalStorage.setItem('shop_page_cache', JSON.stringify(newData));
  } catch (error) {
    console.warn("Error updating shop page cache:", error);
  }
};

export default function Shop() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const activeSubcategory = searchParams.get('subcategory');
  const activeOfferId = searchParams.get('offerId');
  const [activeOffer, setActiveOffer] = useState<any>(null);
  
  // Load shop page cache synchronously
  const cachedShopData = useMemo(() => {
    try {
      const cached = safeLocalStorage.getItem('shop_page_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Error parsing shop page cache on startup", e);
    }
    return null;
  }, []);

  const [products, setProducts] = useState<any[]>(() => cachedShopData?.products || []);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>(() => cachedShopData?.configs || []);
  const [isLoading, setIsLoading] = useState(() => !(cachedShopData?.products?.length > 0));
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { wishlist } = useWishlist();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Advanced Filters State
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);

  // Myntra Specific Filters State
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [onlyExpress, setOnlyExpress] = useState<boolean>(false);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  const setActiveCategory = (category: string | null) => {
    triggerHaptic('light');
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
    // Reset advanced filters and Myntra specific filters when category changes
    setPriceFilters([]);
    setSelectedSizes([]);
    setMinRating(0);
    setSortBy('relevance');
    setSelectedPatterns([]);
    setSelectedFabrics([]);
    setMinDiscount(0);
    setOnlyExpress(false);
  };

  const setActiveSubcategory = (subcategory: string | null) => {
    triggerHaptic('light');
    if (subcategory) {
      setSearchParams({ subcategory });
    } else {
      setSearchParams({});
    }
    // Reset advanced filters and Myntra specific filters when subcategory changes
    setPriceFilters([]);
    setSelectedSizes([]);
    setMinRating(0);
    setSortBy('relevance');
    setSelectedPatterns([]);
    setSelectedFabrics([]);
    setMinDiscount(0);
    setOnlyExpress(false);
  };

  const availableCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).filter(Boolean).sort();
  }, [products]);

  const subcategoriesByCategory = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    products.forEach(p => {
      if (p.category) {
        if (!map[p.category]) map[p.category] = new Set();
        if (p.subcategory) map[p.category].add(p.subcategory);
      }
    });
    return Object.fromEntries(
      Object.entries(map).map(([cat, subs]) => [cat, Array.from(subs).filter(Boolean).sort()])
    );
  }, [products]);

  // Fetch category configs once on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'category_configs'));
        const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategoryConfigs(configs);
        
        updateShopPageCache({ configs });
      } catch (error) {
        console.error("Error fetching configs:", error);
      }
    };
    fetchConfigs();
  }, []);

  // Fetch products with smart indexing and limit paging
  useEffect(() => {
    let active = true;
    const fetchProducts = async () => {
      // Avoid showing screen blocker if we're on the initial general shop view and have products loaded from cache
      const isInitialGeneralLoad = !activeCategory && !activeSubcategory && !activeOfferId;
      if (products.length === 0 || !isInitialGeneralLoad) {
        setIsLoading(true);
      }
      try {
        let constraints: any[] = [];
        
        if (activeCategory) {
          constraints.push(where('category', '==', activeCategory));
        }
        if (activeSubcategory && activeSubcategory !== 'General') {
          constraints.push(where('subcategory', '==', activeSubcategory));
        }
        if (activeOfferId) {
          constraints.push(where('offerId', '==', activeOfferId));
        }
        
        // Only use global orderBy if no other filtering where clauses exist, ensuring 100% fail-safe behavior
        if (!activeCategory && !activeSubcategory && !activeOfferId) {
          constraints.push(orderBy('createdAt', 'desc'));
        }
        
        constraints.push(limit(40));

        const q = query(collection(db, 'products'), ...constraints);
        const snapshot = await getDocs(q);

        if (!active) return;

        const firestoreProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (snapshot.docs.length > 0) {
          setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === 40);
        } else {
          setLastVisibleDoc(null);
          setHasMore(false);
        }

        setProducts(firestoreProducts);
        setIsLoading(false);

        // Cached for offline (only on general unfilters)
        if (!activeCategory && !activeSubcategory && !activeOfferId) {
          try {
            const prunedProducts = firestoreProducts.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              originalPrice: p.originalPrice,
              image: p.image,
              category: p.category,
              subcategory: p.subcategory,
              sizes: p.sizes || [],
              discount: p.discount || 0,
              rating: p.rating || 0
            }));
            updateShopPageCache({ products: prunedProducts });
          } catch (cacheErr) {}
        }
      } catch (error) {
        console.error("Error loading products:", error);
        if (active) {
          // Attempt offline fallback values
          const cachedData = safeLocalStorage.getItem('shop_page_cache');
          if (cachedData) {
            try {
              const { products: cachedProducts } = JSON.parse(cachedData);
              if (cachedProducts) setProducts(cachedProducts);
            } catch (e) {}
          }
          setIsLoading(false);
        }
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, [activeCategory, activeSubcategory, activeOfferId]);

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMore || !lastVisibleDoc) return;
    setIsFetchingMore(true);
    try {
      let constraints: any[] = [];
      if (activeCategory) {
        constraints.push(where('category', '==', activeCategory));
      }
      if (activeSubcategory && activeSubcategory !== 'General') {
        constraints.push(where('subcategory', '==', activeSubcategory));
      }
      if (activeOfferId) {
        constraints.push(where('offerId', '==', activeOfferId));
      }
      if (!activeCategory && !activeSubcategory && !activeOfferId) {
        constraints.push(orderBy('createdAt', 'desc'));
      }
      constraints.push(startAfter(lastVisibleDoc));
      constraints.push(limit(40));

      const q = query(collection(db, 'products'), ...constraints);
      const snapshot = await getDocs(q);

      const nextProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (snapshot.docs.length > 0) {
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 40);
        setProducts(prev => [...prev, ...nextProducts]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error fetching more products:", err);
      toast.error("Failed to load more products");
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (activeOfferId) {
      const fetchOfferMetadata = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const docSnap = await getDoc(doc(db, 'offers', activeOfferId));
          if (docSnap.exists()) {
            setActiveOffer({ id: docSnap.id, ...docSnap.data() });
          } else {
            setActiveOffer({ id: activeOfferId, title: "Special Deal Collection", discountPercent: 10 });
          }
        } catch (error) {
          console.error("Error fetching offer metadata:", error);
        }
      };
      fetchOfferMetadata();
    } else {
      setActiveOffer(null);
    }
  }, [activeOfferId]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeOfferId) {
      result = result.filter(p => p.offerId === activeOfferId);
    }
    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
    }
    
    if (activeSubcategory) {
      result = result.filter(p => (p.subcategory || 'General') === activeSubcategory);
    }
    
    // Search Filter
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

    // Price Filter
    if (priceFilters.length > 0) {
      result = result.filter(p => {
        const price = p.price;
        return priceFilters.some(range => {
          if (range === 'Below ₹500') return price < 500;
          if (range === '₹500 - ₹1000') return price >= 500 && price <= 1000;
          if (range === '₹1000 - ₹2000') return price > 1000 && price <= 2000;
          if (range === 'Above ₹2000') return price > 2000;
          return false;
        });
      });
    }

    // Size Filter
    if (selectedSizes.length > 0) {
      result = result.filter(p => 
        p.sizes && p.sizes.some((s: string) => selectedSizes.includes(s))
      );
    }

    // Rating Filter
    if (minRating > 0) {
      result = result.filter(p => (p.averageRating || 0) >= minRating);
    }

    // --- Myntra Filter Integrations ---
    result = result.filter(p => {
      const { pattern, fabric, discount, deliveryDays } = getProductExtraDetails(p);

      // Pattern Filter
      if (selectedPatterns.length > 0 && !selectedPatterns.includes(pattern)) {
        return false;
      }

      // Fabric Filter
      if (selectedFabrics.length > 0 && !selectedFabrics.includes(fabric)) {
        return false;
      }

      // Discount Filter
      if (minDiscount > 0 && discount < minDiscount) {
        return false;
      }

      // Express Delivery Filter
      if (onlyExpress && deliveryDays > 2) {
        return false;
      }

      return true;
    });

    // --- Sorting Options ---
    const sortedResult = [...result];
    if (sortBy === 'priceLow') {
      sortedResult.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceHigh') {
      sortedResult.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      sortedResult.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'discount') {
      sortedResult.sort((a, b) => {
        const discA = getProductExtraDetails(a).discount;
        const discB = getProductExtraDetails(b).discount;
        return discB - discA;
      });
    }

    return sortedResult;
  }, [products, activeCategory, activeSubcategory, searchQuery, priceFilters, selectedSizes, minRating, sortBy, selectedPatterns, selectedFabrics, minDiscount, onlyExpress, activeOfferId]);

  const productsBySubcategory = useMemo(() => {
    if (!activeCategory) return [];

    const subcats = new Set(filteredProducts.map(p => p.subcategory || 'General'));
    const sortedSubcats = Array.from(subcats).sort((a, b) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });

    return sortedSubcats.map(subcat => ({
      title: subcat,
      products: filteredProducts.filter(p => (p.subcategory || 'General') === subcat)
    })).filter(group => group.products.length > 0);
  }, [filteredProducts, activeCategory]);

  const allAvailableSubcategories = useMemo(() => {
    const subs = new Set(products.map(p => p.subcategory).filter(Boolean));
    return Array.from(subs).sort();
  }, [products]);

  const FilterContent = () => (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#C5A059]">Collection</h3>
          {(priceFilters.length > 0 || selectedSizes.length > 0 || minRating > 0 || selectedPatterns.length > 0 || selectedFabrics.length > 0 || minDiscount > 0 || onlyExpress) && (
            <button 
              onClick={() => {
                setPriceFilters([]);
                setSelectedSizes([]);
                setMinRating(0);
                setSelectedPatterns([]);
                setSelectedFabrics([]);
                setMinDiscount(0);
                setOnlyExpress(false);
              }}
              className="group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-black/30 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              Reset All
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {availableCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "group flex items-center justify-between py-3 px-5 rounded-[20px] text-sm font-bold transition-all border",
                activeCategory === cat 
                  ? "bg-black text-white border-black shadow-xl shadow-black/10 scale-[1.02]" 
                  : "bg-black/5 text-black/40 border-transparent hover:bg-black/10 hover:text-black hover:border-black/5"
              )}
            >
              <span className="uppercase tracking-tight">{cat}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                activeCategory === cat ? "-rotate-90 text-[#C5A059]" : "opacity-0 -group-hover:translate-x-1 group-hover:opacity-100"
              )} />
            </button>
          ))}
        </div>
      </div>

      <Accordion className="w-full space-y-4">
        {/* Express Delivery */}
        <AccordionItem value="express" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Delivery Time
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <label className={cn(
              "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2",
              onlyExpress ? "bg-white border-black shadow-sm" : "bg-white/50 border-transparent hover:border-black/5"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                onlyExpress ? "bg-black border-black" : "border-black/10"
              )}>
                {onlyExpress && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={onlyExpress}
                onChange={() => {
                  triggerHaptic('light');
                  setOnlyExpress(!onlyExpress);
                }}
              />
              <span className={cn(
                "text-xs font-black uppercase tracking-widest",
                onlyExpress ? "text-black" : "text-black/40"
              )}>Express Fast Delivery (within 48 hrs)</span>
            </label>
          </AccordionContent>
        </AccordionItem>

        {/* Pattern Selection */}
        <AccordionItem value="pattern" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Design Themes & Patterns
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="grid grid-cols-2 gap-2">
              {['Solid', 'Printed', 'Striped', 'Checked', 'Embroidered'].map(pattern => (
                <button 
                  key={pattern}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedPatterns(prev => 
                      prev.includes(pattern) ? prev.filter(p => p !== pattern) : [...prev, pattern]
                    );
                  }}
                  className={cn(
                    "p-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-2",
                    selectedPatterns.includes(pattern)
                      ? "bg-black text-white border-black shadow-sm"
                      : "bg-white text-black/40 border-black/5 hover:border-black/20"
                  )}
                >
                  {pattern}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fabric Selection */}
        <AccordionItem value="fabric" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Material & Fabric
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="grid grid-cols-2 gap-2">
              {['Cotton Blend', 'Linen', 'Denim', 'Silk', 'Wool', 'Polyester'].map(fabric => (
                <button 
                  key={fabric}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedFabrics(prev => 
                      prev.includes(fabric) ? prev.filter(f => f !== fabric) : [...prev, fabric]
                    );
                  }}
                  className={cn(
                    "p-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border-2",
                    selectedFabrics.includes(fabric)
                      ? "bg-black text-white border-black shadow-sm"
                      : "bg-white text-black/40 border-black/5 hover:border-black/20"
                  )}
                >
                  {fabric}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Discount Targets */}
        <AccordionItem value="discount" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Discount Targets
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="flex flex-col gap-2">
              {[10, 20, 30, 50].map(disc => (
                <button 
                  key={disc}
                  onClick={() => {
                    triggerHaptic('light');
                    setMinDiscount(minDiscount === disc ? 0 : disc);
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all border-2",
                    minDiscount === disc
                      ? "bg-white border-black shadow-sm"
                      : "bg-white/50 border-transparent hover:border-black/5"
                  )}
                >
                  <span className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    minDiscount === disc ? "text-black" : "text-black/40"
                  )}>
                    {disc}% Off & Above
                  </span>
                  {minDiscount === disc && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="size" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger 
            onClick={() => triggerHaptic('light')}
            className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]"
          >
            Size Selection
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="grid grid-cols-4 gap-3">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                <button 
                  key={size} 
                  onClick={() => {
                    setSelectedSizes(prev => 
                      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                    );
                  }}
                  className={cn(
                    "h-12 flex items-center justify-center rounded-xl text-xs font-black transition-all border-2",
                    selectedSizes.includes(size)
                      ? "bg-black text-white border-black shadow-lg"
                      : "bg-white text-black/40 border-black/5 hover:border-black/20"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="price" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Price Range
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="grid grid-cols-1 gap-2">
              {['Below ₹500', '₹500 - ₹1000', '₹1000 - ₹2000', 'Above ₹2000'].map(range => (
                <label 
                  key={range} 
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2",
                    priceFilters.includes(range)
                      ? "bg-white border-black shadow-sm"
                      : "bg-white/50 border-transparent hover:border-black/5"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    priceFilters.includes(range) ? "bg-black border-black" : "border-black/10"
                  )}>
                    {priceFilters.includes(range) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={priceFilters.includes(range)}
                    onChange={() => {
                      triggerHaptic('light');
                      setPriceFilters(prev => 
                        prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
                      );
                    }}
                  />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    priceFilters.includes(range) ? "text-black" : "text-black/40"
                  )}>{range}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rating" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
            Product Rating
          </AccordionTrigger>
          <AccordionContent className="pb-8">
            <div className="flex flex-col gap-2">
              {[4, 3, 2, 1].map(stars => (
                <button 
                  key={stars}
                  onClick={() => {
                    triggerHaptic('light');
                    setMinRating(stars);
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all border-2",
                    minRating === stars
                      ? "bg-white border-black shadow-sm"
                      : "bg-white/50 border-transparent hover:border-black/5"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-3.5 h-3.5",
                          i < stars ? "text-[#C5A059] fill-[#C5A059]" : "text-black/10 fill-black/5"
                        )}
                      />
                    ))}
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest ml-2",
                      minRating === stars ? "text-black" : "text-black/40"
                    )}>
                      {stars === 4 ? "Premium Selection" : `${stars}+ Stars`}
                    </span>
                  </div>
                  {minRating === stars && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-4">
        <p className="text-[9px] font-bold text-black/20 uppercase tracking-[0.3em] text-center mb-4">
          Showing {filteredProducts.length} matched products
        </p>
      </div>
    </div>
  );

  const rightmostIndices = (() => {
    const indices: boolean[] = [];
    let currentSum = 0;
    availableCategories.forEach((cat, idx) => {
      const pattern = [3, 3, 6, 2, 2, 2];
      const span = pattern[idx % pattern.length];
      currentSum += span;
      if (currentSum === 6) {
        indices.push(true);
        currentSum = 0;
      } else {
        indices.push(false);
      }
    });
    return indices;
  })();

  return (
    <div className="bg-[#F7F4F0] min-h-screen pb-48 pt-24 relative">
      {/* Explore Collection Title (Goes up with page when scrolled) */}
      <div className="px-4 mb-4 text-center animate-fade-in select-none">
        <h1 className="text-[12px] font-black tracking-[0.3em] text-[#111] uppercase">
          Explore Collection
        </h1>
        <p className="text-[7px] text-[#C5A059] font-black uppercase tracking-[0.2em] mt-1.5">
          Curated Premium Looks
        </p>
      </div>

      {/* Interactive Search Option */}
      <div className="px-4 mb-6 animate-fade-in">
        <div className="relative flex items-center bg-white/75 backdrop-blur-md rounded-2xl border border-black/[0.04] shadow-sm hover:border-[#C5A059]/35 focus-within:border-[#C5A059] transition-all duration-300">
          <Search className="absolute left-4 w-4 h-4 text-[#C5A059]" strokeWidth={2.5} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              triggerHaptic('light');
            }}
            placeholder="Search custom looks, fabrics, vibes..."
            className="w-full bg-transparent pl-11 pr-10 py-3.5 text-xs text-black placeholder-black/35 font-medium tracking-wide focus:outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                triggerHaptic('medium');
              }}
              className="absolute right-4 text-black/30 hover:text-black transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 1. Curated Looks Category Circles at the Top */}
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black tracking-[0.25em] text-[#C5A059] uppercase block">
                Top Categories
              </span>
              {isAdmin && (
                <Link 
                  to="/manage-categories"
                  onClick={() => triggerHaptic('light')}
                  className="flex items-center gap-1.5 text-[9px] font-black text-[#C5A059] uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  Edit
                </Link>
              )}
            </div>
            
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 scroll-smooth">
              {/* ALL Looks Category option */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setActiveCategory(null);
                  setActiveSubcategory(null);
                }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all bg-black/[0.03] border-2",
                  (!activeCategory && !activeSubcategory)
                    ? "border-black scale-105 shadow-md bg-white"
                    : "border-transparent bg-neutral-100 group-hover:border-black/10"
                )}>
                  <div className="w-[52px] h-[52px] rounded-full bg-black/5 flex items-center justify-center font-black text-[9px] uppercase tracking-widest text-[#C5A059]">
                    ALL
                  </div>
                </div>
                <span className={cn(
                  "text-[8px] font-black tracking-wider uppercase text-center transition-colors",
                  (!activeCategory && !activeSubcategory) ? "text-[#C5A059] font-black" : "text-black/40"
                )}>
                  All Looks
                </span>
              </div>

              {availableCategories.map((cat, idx) => {
                const config = categoryConfigs.find(c => c.name === cat);
                const categoryImage = config?.imageUrl || products.find(p => p.category === cat)?.image;
                const isSelected = activeCategory === cat;

                return (
                  <div 
                    key={cat}
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveCategory(isSelected ? null : cat);
                      setActiveSubcategory(null);
                    }}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 overflow-hidden bg-white/50",
                      isSelected
                        ? "border-black scale-105 shadow-md bg-white"
                        : "border-transparent group-hover:border-black/10"
                    )}>
                      {categoryImage ? (
                        <img 
                          src={categoryImage} 
                          alt={cat} 
                          className="w-[52px] h-[52px] rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#FFDEE9] to-[#B5FFFC] flex items-center justify-center font-black text-white text-xs">
                          {cat.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-[8px] font-black tracking-wider uppercase text-center transition-colors",
                      isSelected ? "text-black font-black" : "text-black/40"
                    )}>
                      {cat}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Subcategories horizontal filter badges (always present, category-specific or overall) */}
          <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto no-scrollbar scroll-smooth mb-4 border-b border-black/5 pb-3">
            <button 
              onClick={() => {
                triggerHaptic('light');
                setActiveSubcategory(null);
              }}
              className={cn(
                "whitespace-nowrap text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all border",
                !activeSubcategory ? "bg-black text-white border-black" : "text-black/50 border-black/5 hover:border-black/20"
              )}
            >
              {activeCategory ? `All ${activeCategory}` : 'All Looks'}
            </button>
            
            {(activeCategory ? subcategoriesByCategory[activeCategory] || [] : allAvailableSubcategories).map(sub => (
              <button
                key={sub}
                onClick={() => {
                  triggerHaptic('light');
                  setActiveSubcategory(sub);
                }}
                className={cn(
                  "whitespace-nowrap text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all border",
                  activeSubcategory === sub ? "bg-black text-white border-black" : "text-black/50 border-black/5 hover:border-black/20"
                )}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Hide the old grid layout so we don't have visual duplicate */}
          <div className="hidden">
            <div className="px-4 mb-8 flex items-center justify-between">
            <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">Shop by Category</h2>
            {isAdmin && (
              <Link 
                to="/manage-categories"
                className="flex items-center gap-2 text-[10px] font-black text-[#C5A059] uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
                Edit Categories
              </Link>
            )}
          </div>
          <div className="grid grid-cols-6 gap-0 border-t border-[#e5e5e5]">
            {availableCategories.map((cat, idx) => {
              const config = categoryConfigs.find(c => c.name === cat);
              const categoryImage = config?.imageUrl || products.find(p => p.category === cat)?.image;
              
              const pattern = [3, 3, 6, 2, 2, 2];
              const span = pattern[idx % pattern.length];
              const isFullWidth = span === 6;
              const isSmall = span === 2;
              
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "group relative flex flex-col h-full bg-white border-b-[0.5px] border-[#e5e5e5]",
                    !rightmostIndices[idx] && "border-r-[0.5px] border-[#e5e5e5]",
                    span === 3 ? "col-span-3" : span === 6 ? "col-span-6" : "col-span-2"
                  )}
                >
                  <div 
                    onClick={() => setActiveCategory(cat)}
                    className="flex flex-col h-full text-left cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveCategory(cat);
                      }
                    }}
                  >
                    <div className={cn(
                      "relative overflow-hidden bg-gray-50 flex items-center justify-center",
                      isFullWidth ? "aspect-[16/9] sm:aspect-[21/9]" : 
                      isSmall ? "aspect-square sm:aspect-[4/5]" : 
                      "aspect-[2/3] sm:aspect-[3/4]"
                    )}>
                      {categoryImage ? (
                        <img 
                          src={categoryImage} 
                          alt={cat} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={cn(
                          "w-full h-full flex items-center justify-center font-black uppercase transition-transform duration-700 group-hover:scale-110",
                          isFullWidth ? "text-7xl" : isSmall ? "text-3xl" : "text-5xl",
                          idx % 3 === 0 ? "bg-gradient-to-br from-[#FFDEE9] to-[#B5FFFC]" : 
                          idx % 3 === 1 ? "bg-gradient-to-br from-[#8BC6EC] to-[#9599E2]" :
                          "bg-gradient-to-br from-[#FBAB7E] to-[#F7CE68]",
                          "text-white"
                        )}>
                          {cat.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                      
                      {isAdmin && (
                        <Link
                          to="/manage-categories"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                        >
                          <Edit2 className="w-5 h-5" />
                        </Link>
                      )}
                    </div>
                    
                    <div className={cn(
                      "p-4 flex flex-col mt-auto",
                      isSmall && "p-2"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-bold uppercase tracking-[0.2em] text-black/70",
                            isSmall ? "text-[7px]" : "text-[10px]"
                          )}>
                            {cat}
                          </span>
                          {!isSmall && (
                            <span className="text-[9px] font-bold text-black/30 uppercase tracking-tighter mt-0.5">
                              {products.filter(p => p.category === cat).length} Products
                            </span>
                          )}
                        </div>
                        {!isSmall && <ChevronDown className="w-4 h-4 text-black/20 group-hover:text-black transition-colors -rotate-90" />}
                      </div>

                      {/* Subcategories List */}
                      {!isSmall && subcategoriesByCategory[cat]?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 overflow-hidden max-h-24">
                          {subcategoriesByCategory[cat].map(sub => (
                            <button
                              key={sub}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSubcategory(sub);
                              }}
                              className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-black/5 hover:bg-black hover:text-white rounded-full transition-all border border-black/5"
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      {/* Products View */}


          <div className="max-w-7xl mx-auto py-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-10 px-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-black/60" />
                <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">
                  {activeSubcategory || activeCategory || 'Vibe Search'}
                </h2>
              </div>
            </div>

            {activeOffer && (
              <div className="mx-4 mb-8 p-6 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-850 text-white relative overflow-hidden shadow-md">
                <div className="absolute right-[-20px] bottom-[-30px] text-9xl font-black text-white/5 pointer-events-none select-none">
                  {activeOffer.discountPercent || 10}%
                </div>
                <div className="flex items-start justify-between relative z-10">
                  <div className="text-left">
                    <span className="text-[8px] font-black tracking-[0.25em] text-[#C5A059] uppercase block mb-1">
                      ACTIVE PROMOTION
                    </span>
                    <h2 className="text-xl font-brand font-black uppercase tracking-tight text-white mb-1">
                      {activeOffer.title}
                    </h2>
                    {activeOffer.description && (
                      <p className="text-[10px] text-white/60 font-medium max-w-sm sm:max-w-md">
                        {activeOffer.description}
                      </p>
                    )}
                    <span className="inline-block mt-3 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full">
                      FLAT {activeOffer.discountPercent}% OFF ON THESE SELECTED LOOKS
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      params.delete('offerId');
                      setSearchParams(params);
                    }}
                    className="p-1 px-3 bg-white/12 hover:bg-white/20 transition-all text-white text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Subcategory Grouped View (If Category selected) or Flat Grid (If Subcategory selected) */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-[#e5e5e5] [&>*:nth-child(2n)_.group]:border-r-0 md:[&>*:nth-child(2n)_.group]:border-r-[0.5px] md:[&>*:nth-child(3n)_.group]:border-r-0 lg:[&>*:nth-child(3n)_.group]:border-r-[0.5px] lg:[&>*:nth-child(4n)_.group]:border-r-0 animate-fade-in">
                {[...Array(8)].map((_, index) => (
                  <div 
                    key={index} 
                    className="bg-white p-4 border-b-[0.5px] border-r-[0.5px] border-[#e5e5e5] flex flex-col justify-start select-none
                      [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r-[0.5px] md:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r-[0.5px] lg:[&:nth-child(4n)]:border-r-0"
                  >
                    <div className="aspect-[3/4] w-full bg-neutral-100 animate-pulse rounded-2xl mb-4" />
                    <div className="h-3 w-1/3 bg-neutral-100 animate-pulse rounded mb-2" />
                    <div className="h-4 w-3/4 bg-neutral-100 animate-pulse rounded mb-2.5" />
                    <div className="h-4 w-1/4 bg-neutral-100 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : activeCategory && !activeSubcategory && !searchQuery ? (
              <div className="space-y-16">
                {productsBySubcategory.map((group) => (
                  <section key={group.title} className="relative">
                    <div className="flex items-center gap-3 mb-6 px-4">
                      <div className="w-1 h-8 bg-black rounded-full" />
                      <h3 className="text-xs font-bold text-black uppercase tracking-[0.3em]">
                        {group.title}
                      </h3>
                      <span className="text-[10px] font-black text-black/20 uppercase tracking-widest ml-auto">
                        {group.products.length} Items
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-[#e5e5e5] [&>*:nth-child(2n)_.group]:border-r-0 md:[&>*:nth-child(2n)_.group]:border-r-[0.5px] md:[&>*:nth-child(3n)_.group]:border-r-0 lg:[&>*:nth-child(3n)_.group]:border-r-[0.5px] lg:[&>*:nth-child(4n)_.group]:border-r-0">
                      {group.products.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white"
                        >
                          <ProductCard {...product} priority={index < 4} />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Flat Grid for Search Results */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-[#e5e5e5] [&>*:nth-child(2n)_.group]:border-r-0 md:[&>*:nth-child(2n)_.group]:border-r-[0.5px] md:[&>*:nth-child(3n)_.group]:border-r-0 lg:[&>*:nth-child(3n)_.group]:border-r-[0.5px] lg:[&>*:nth-child(4n)_.group]:border-r-0">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (index % 4) * 0.1 }}
                    className="bg-white"
                  >
                    <ProductCard {...product} priority={index < 4} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Dynamic Load More Button */}
            {hasMore && !isLoading && (
              <div className="flex justify-center my-10 px-4">
                <Button 
                  onClick={handleLoadMore}
                  disabled={isFetchingMore}
                  className="w-full max-w-xs h-14 bg-black text-white hover:bg-black/90 font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-sm transition-all active:scale-98"
                >
                  {isFetchingMore ? 'LOADING PRODUCTS...' : 'LOAD MORE PRODUCTS'}
                </Button>
              </div>
            )}

            {filteredProducts.length > 0 && !isLoading && (activeCategory || activeSubcategory || searchQuery) && (
              <EndOfFeedSuggestions 
                currentCategory={activeCategory}
                currentSubcategory={activeSubcategory}
                allCategories={availableCategories}
                allSubcategories={allAvailableSubcategories}
                onSelectCategory={setActiveCategory}
                onSelectSubcategory={setActiveSubcategory}
              />
            )}

            {filteredProducts.length === 0 && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-32 text-center bg-black/5 rounded-[40px] border-2 border-dashed border-black/10 mx-4"
              >
                <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-black/20" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-black">NO MATCHES FOUND</h3>
                <p className="text-sm text-black/40 font-bold mb-8 uppercase tracking-widest px-8">
                  {searchQuery 
                    ? `WE COULDN'T FIND ANYTHING FOR "${searchQuery.toUpperCase()}"`
                    : "TRY ADJUSTING YOUR FILTERS TO FIND WHAT YOU'RE LOOKING FOR"}
                </p>
                <Button 
                  onClick={() => {
                    triggerHaptic('medium');
                    setActiveCategory(null);
                    setActiveSubcategory(null);
                    setSearchQuery('');
                    setPriceFilters([]);
                    setSelectedSizes([]);
                    setMinRating(0);
                  }} 
                  className="bg-black text-white font-black px-10 py-6 rounded-full hover:scale-105 active:scale-95 transition-all text-xs tracking-widest"
                >
                  RESET ALL FILTERS
                </Button>
              </motion.div>
            )}
          </div>
      {/* 5. Custom Floating Controls Bar Docked Above Bottom Navigation (Filter & Sort by) */}
      <div className="fixed bottom-[74px] left-1/2 -translate-x-1/2 z-[40] w-full max-w-[340px] px-4 pointer-events-none animate-fade-in">
        <div className="bg-black/95 backdrop-blur-md text-white py-2 px-3.5 rounded-full shadow-2xl flex items-center justify-between pointer-events-auto border border-white/10 select-none">
          {/* Custom Sort by trigger inside floating capsule */}
          <div className="relative flex items-center gap-1 flex-1 pr-1">
            <select
              value={sortBy}
              onChange={(e) => {
                triggerHaptic('light');
                setSortBy(e.target.value);
              }}
              className="appearance-none bg-transparent text-[8.5px] font-black uppercase tracking-widest text-white pl-2 pr-6 py-1.5 cursor-pointer focus:outline-none transition-all border-none w-full"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.25rem center',
                backgroundSize: '0.8em 0.8em',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <option value="relevance" className="bg-[#111] text-white">RELEVANCE</option>
              <option value="discount" className="bg-[#111] text-white">DISCOUNT</option>
              <option value="priceLow" className="bg-[#111] text-white">PRICE: LOW-HIGH</option>
              <option value="priceHigh" className="bg-[#111] text-white">PRICE: HIGH-LOW</option>
              <option value="rating" className="bg-[#111] text-white">TOP RATED</option>
            </select>
          </div>

          <div className="w-[1px] h-4 bg-white/20 mx-1.5" />

          {/* Filtering trigger inside floating capsule */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger
              render={
                <button 
                  onClick={() => triggerHaptic('light')}
                  className="flex items-center justify-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-[#C5A059] px-3 py-1.5 hover:opacity-85 transition-opacity cursor-pointer whitespace-nowrap bg-transparent border-none outline-none"
                />
              }
            >
              <SlidersHorizontal className="h-2.5 w-2.5" strokeWidth={2.5} />
              Filters
              {(priceFilters.length > 0 || selectedSizes.length > 0 || minRating > 0 || selectedPatterns.length > 0 || selectedFabrics.length > 0 || minDiscount > 0 || onlyExpress) && (
                <span className="w-1 h-1 bg-[#C5A059] rounded-full animate-ping" />
              )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[40px] px-0 bg-white border-black/10 flex flex-col overflow-hidden">
              <div className="mt-8 px-8 flex-shrink-0">
                <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-8" />
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-black">Filter Your Vibe</h2>
                  <button 
                    onClick={() => setIsFilterOpen(false)}
                    className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-32">
                <FilterContent />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent pt-12 z-20">
                <Button 
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full bg-black text-white font-black py-7 rounded-2xl shadow-2xl shadow-black/20 hover:bg-[#C5A059] hover:text-[#111] active:scale-[0.98] transition-all"
                >
                  VIEW {filteredProducts.length} PRODUCTS
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <BrandSignature variant="dark" className="mt-12 mb-20 opacity-30" />
    </div>
  );
}
