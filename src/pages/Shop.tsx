import { useState, useEffect, useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
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

export default function Shop() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const activeSubcategory = searchParams.get('subcategory');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        const firestoreProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProducts(firestoreProducts);
        setIsLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    };

    const fetchConfigs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'category_configs'));
        setCategoryConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching configs:", error);
      }
    };

    fetchProducts();
    fetchConfigs();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
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
  }, [products, activeCategory, activeSubcategory, searchQuery, priceFilters, selectedSizes, minRating, sortBy, selectedPatterns, selectedFabrics, minDiscount, onlyExpress]);

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

  return (
    <div className="bg-background min-h-screen pb-40 pt-28">
      {!activeCategory && !activeSubcategory && !searchQuery ? (
        /* Categories Grid View */
        <div className="py-6">
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
          <div className="grid grid-cols-6 gap-0 border-t border-l border-[#e5e5e5]">
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
                    "group relative flex flex-col h-full bg-white border-r-[0.5px] border-b-[0.5px] border-[#e5e5e5]",
                    span === 3 ? "col-span-3" : span === 6 ? "col-span-6" : "col-span-2"
                  )}
                >
                  <button 
                    onClick={() => setActiveCategory(cat)}
                    className="flex flex-col h-full text-left"
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
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Products View */
        <>
          {/* Horizontal Categories (Breadcrumb style) */}
          <div className="sticky top-28 z-40 bg-white/80 backdrop-blur-md border-b border-black/5">
            <div className="flex items-center gap-2 py-4 px-4 overflow-x-auto no-scrollbar scroll-smooth">
              <button 
                onClick={() => {
                  setActiveCategory(null);
                  setActiveSubcategory(null);
                }}
                className={cn(
                  "whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border",
                  !activeCategory && !activeSubcategory ? "bg-black text-white border-black" : "text-black/40 border-black/5 hover:border-black/20"
                )}
              >
                All
              </button>
              
              {allAvailableSubcategories.map(sub => (
                <button
                  key={sub}
                  onClick={() => setActiveSubcategory(sub)}
                  className={cn(
                    "whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border",
                    activeSubcategory === sub ? "bg-black text-white border-black" : "text-black/40 border-black/5 hover:border-black/20"
                  )}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-black/60" />
                <h2 className="text-xs font-bold text-black uppercase tracking-[0.3em]">
                  {activeSubcategory || activeCategory || 'Vibe Search'}
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Sort By Selector */}
                <div className="relative flex items-center gap-1.5">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      triggerHaptic('light');
                      setSortBy(e.target.value);
                    }}
                    className="appearance-none bg-black/5 hover:bg-black/10 text-[10px] font-black uppercase tracking-widest text-black pl-4 pr-8 py-2 rounded-full cursor-pointer focus:outline-none transition-all border-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1em 1em',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    <option value="relevance">Sort: Relevance</option>
                    <option value="discount">Sort: Better Discount</option>
                    <option value="priceLow">Sort: Price Low-High</option>
                    <option value="priceHigh">Sort: Price High-Low</option>
                    <option value="rating">Sort: Top Rated</option>
                  </select>
                </div>

                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black bg-black/5 px-4 py-2 rounded-full hover:bg-black/10 transition-all cursor-pointer">
                      <SlidersHorizontal className="h-3 w-3" />
                      Filter
                      {(priceFilters.length > 0 || selectedSizes.length > 0 || minRating > 0 || selectedPatterns.length > 0 || selectedFabrics.length > 0 || minDiscount > 0 || onlyExpress) && (
                        <span className="ml-1 w-1.5 h-1.5 bg-[#C5A059] rounded-full" />
                      )}
                    </div>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-[40px] px-8 bg-white border-black/10 overflow-y-auto no-scrollbar">
                    <div className="mt-8 pb-32">
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
                      
                      <FilterContent />
                      
                      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent pt-12">
                        <Button 
                          onClick={() => setIsFilterOpen(false)}
                          className="w-full bg-black text-white font-black py-7 rounded-2xl shadow-2xl shadow-black/20 hover:bg-black/90 active:scale-[0.98] transition-all"
                        >
                          VIEW {filteredProducts.length} PRODUCTS
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Subcategory Grouped View (If Category selected) or Flat Grid (If Subcategory selected) */}
            {activeCategory && !activeSubcategory && !searchQuery ? (
              <div className="space-y-16">
                {productsBySubcategory.map((group) => (
                  <section key={group.title} className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-8 bg-black rounded-full" />
                      <h3 className="text-xs font-bold text-black uppercase tracking-[0.3em]">
                        {group.title}
                      </h3>
                      <span className="text-[10px] font-black text-black/20 uppercase tracking-widest ml-auto">
                        {group.products.length} Items
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-[#e5e5e5]">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 border-t border-l border-[#e5e5e5]">
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

            {filteredProducts.length > 0 && (activeCategory || activeSubcategory || searchQuery) && (
              <EndOfFeedSuggestions 
                currentCategory={activeCategory}
                currentSubcategory={activeSubcategory}
                allCategories={availableCategories}
                allSubcategories={allAvailableSubcategories}
                onSelectCategory={setActiveCategory}
                onSelectSubcategory={setActiveSubcategory}
              />
            )}

            {filteredProducts.length === 0 && (
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
        </>
      )}
      <BrandSignature variant="dark" className="mt-12 mb-20 opacity-30" />
    </div>
  );
}
