import { useState, useEffect, useMemo } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Filter, ChevronDown, SlidersHorizontal, Heart, Sparkles, TrendingUp, Star, RotateCcw } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import BrandSignature from '@/components/BrandSignature';
import { toast } from 'sonner';
import { useWishlist } from '@/lib/WishlistContext';
import { useSearch } from '@/lib/SearchContext';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';

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

export default function Shop() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { wishlist } = useWishlist();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Advanced Filters State
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);

  const setActiveCategory = (category: string | null) => {
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
    // Reset advanced filters when category changes
    setPriceFilters([]);
    setSelectedSizes([]);
    setMinRating(0);
  };

  const availableCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).filter(Boolean).sort();
  }, [products]);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(firestoreProducts);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubscribeConfigs = onSnapshot(collection(db, 'category_configs'), (snapshot) => {
      setCategoryConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeConfigs();
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter(p => p.category === activeCategory);
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

    return result;
  }, [products, activeCategory, searchQuery, priceFilters, selectedSizes, minRating]);

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

  const FilterContent = () => (
    <div className="space-y-8 pb-12">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#C5A059]">Collection</h3>
          {(priceFilters.length > 0 || selectedSizes.length > 0 || minRating > 0) && (
            <button 
              onClick={() => {
                setPriceFilters([]);
                setSelectedSizes([]);
                setMinRating(0);
              }}
              className="group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-black/30 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              Reset
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
        <AccordionItem value="size" className="border-none bg-black/5 rounded-[24px] px-6 overflow-hidden">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-6 hover:no-underline text-black data-[state=open]:text-[#C5A059]">
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
                  onClick={() => setMinRating(stars)}
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
      {!activeCategory && !searchQuery ? (
        /* Categories Grid View */
        <div className="px-4 py-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-black">Shop by Category</h2>
          <div className="grid grid-cols-1 gap-4">
            {availableCategories.map((cat) => {
              const config = categoryConfigs.find(c => c.name === cat);
              const categoryImage = config?.imageUrl || products.find(p => p.category === cat)?.image || 'https://picsum.photos/seed/fashion/600/800';
              
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className="group relative h-48 overflow-hidden rounded-[32px] w-full text-left active:scale-[0.98] transition-transform"
                >
                  <img 
                    src={categoryImage} 
                    alt={cat} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center px-8">
                    <div>
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-1 group-hover:text-[#C5A059] transition-colors">
                        {cat}
                      </h3>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Explore Collection</p>
                    </div>
                  </div>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all">
                    <ChevronDown className="w-6 h-6 text-white group-hover:text-black -rotate-90" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Products View */
        <>
          {/* Horizontal Categories (Breadcrumb style) */}
          <div className="flex items-center gap-2 py-4 px-4 border-b border-black/5 bg-white/50 backdrop-blur-sm sticky top-28 z-40">
            <button 
              onClick={() => setActiveCategory(null)}
              className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
            >
              Categories
            </button>
            <ChevronDown className="w-3 h-3 text-black/20 -rotate-90" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">
              {activeCategory || 'Search Results'}
            </span>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-black/60" />
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black">
                  {activeCategory || 'Vibe Search'}
                </h2>
              </div>
              
              <div className="flex items-center gap-4">
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger>
                    <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black bg-black/5 px-4 py-2 rounded-full hover:bg-black/10 transition-all">
                      <SlidersHorizontal className="h-3 w-3" />
                      Filter
                      {(priceFilters.length > 0 || selectedSizes.length > 0 || minRating > 0) && (
                        <span className="ml-1 w-1.5 h-1.5 bg-[#C5A059] rounded-full" />
                      )}
                    </button>
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

            {/* Subcategory Grouped View (Like Home Page) */}
            {activeCategory && !searchQuery ? (
              <div className="space-y-16">
                {productsBySubcategory.map((group) => (
                  <section key={group.title} className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-8 bg-black rounded-full" />
                      <h3 className="text-xl font-black uppercase tracking-tighter text-black">
                        {group.title}
                      </h3>
                      <span className="text-[10px] font-black text-black/20 uppercase tracking-widest ml-auto">
                        {group.products.length} Items
                      </span>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 snap-x px-1">
                      {group.products.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="flex-shrink-0 w-[200px] snap-start"
                        >
                          <ProductCard {...product} priority={index < 4} variant="minimal" />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Flat Grid for Search Results */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index % 4 * 0.1 }}
                  >
                    <ProductCard {...product} priority={index < 4} variant="minimal" />
                  </motion.div>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlternatingSearchIcon />
                </div>
                <h3 className="text-xl font-black uppercase mb-2 text-black">Nothing found</h3>
                <p className="text-sm text-black/40 font-bold mb-8">Try adjusting your filters.</p>
                <Button onClick={() => setActiveCategory(null)} className="bg-black text-white font-black px-8 py-4 rounded-full">
                  BACK TO CATEGORIES
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      <BrandSignature variant="dark" className="mt-12 mb-20 opacity-30" />
    </div>
  );
}
