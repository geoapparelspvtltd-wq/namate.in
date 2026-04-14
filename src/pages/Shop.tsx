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
import { Filter, ChevronDown, SlidersHorizontal } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import BrandSignature from '@/components/BrandSignature';
import { toast } from 'sonner';

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    return () => unsubscribe();
  }, []);

  const categoryImages: Record<string, string> = {
    'T-Shirts': 'https://picsum.photos/seed/tshirt/600/800',
    'Hoodies': 'https://picsum.photos/seed/hoodie/600/800',
    'Joggers': 'https://picsum.photos/seed/joggers/600/800',
    'Accessories': 'https://picsum.photos/seed/watch/600/800',
  };

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return [];
    return products.filter(p => p.category === activeCategory);
  }, [products, activeCategory]);

  const FilterContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Categories</h3>
        <div className="flex flex-col gap-2">
          {availableCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "text-left py-2 px-4 rounded-xl text-sm font-bold transition-all",
                activeCategory === cat ? "bg-black text-white" : "text-black/40 hover:bg-black/5 hover:text-[#C5A059]"
              )}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Accordion className="w-full">
        <AccordionItem value="size" className="border-none">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-0 hover:no-underline text-black">Size</AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid grid-cols-4 gap-2">
              {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                <button key={size} className="border-2 border-black/5 py-2 rounded-xl text-xs font-bold hover:border-black/20 transition-colors text-black">
                  {size}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="price" className="border-none mt-6">
          <AccordionTrigger className="text-sm font-black uppercase tracking-widest py-0 hover:no-underline text-black">Price Range</AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-2">
              {['Below ₹500', '₹500 - ₹1000', '₹1000 - ₹2000', 'Above ₹2000'].map(range => (
                <label key={range} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 rounded-full border-2 border-black/10 text-black focus:ring-black bg-transparent" />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-black">{range}</span>
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div className="bg-background min-h-screen pb-40">
      {/* App Header Search */}
      <div className="px-4 py-4">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <AlternatingSearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="Search for styles..." 
            className="w-full bg-black/5 border-none rounded-2xl py-3 pl-16 pr-4 text-sm font-bold focus:ring-2 focus:ring-black/30 transition-all text-black placeholder:text-black/10"
          />
        </div>
      </div>

      {!activeCategory ? (
        /* Categories Grid View */
        <div className="px-4 py-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-black">Shop by Category</h2>
          <div className="grid grid-cols-1 gap-4">
            {availableCategories.map((cat) => {
              const categoryImage = categoryImages[cat] || products.find(p => p.category === cat)?.image || 'https://picsum.photos/seed/fashion/600/800';
              
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className="group relative h-48 overflow-hidden rounded-[32px] w-full text-left"
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
          <div className="flex items-center gap-2 py-4 px-4 border-b border-black/5">
            <button 
              onClick={() => setActiveCategory(null)}
              className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
            >
              Categories
            </button>
            <ChevronDown className="w-3 h-3 text-black/20 -rotate-90" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black">
              {activeCategory}
            </span>
          </div>

          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">
                {filteredProducts.length} Items Found
              </p>
              
              <div className="flex items-center gap-4">
                <Sheet>
                  <SheetTrigger>
                    <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black">
                      <SlidersHorizontal className="h-3 w-3" />
                      Filter
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] rounded-t-[40px] px-8 bg-white border-black/10">
                    <div className="mt-8">
                      <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-8" />
                      <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-black">Filters</h2>
                      <FilterContent />
                      <div className="mt-12">
                        <Button className="w-full bg-black text-white font-black py-6 rounded-2xl">
                          APPLY FILTERS
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black">
                  Sort
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {filteredProducts.map((product, index) => {
                const { id, ...rest } = product;
                return <ProductCard key={id} id={id} {...rest} priority={index < 4} />;
              })}
            </div>

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
