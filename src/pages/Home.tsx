import { useState, useMemo, useEffect, useRef } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles, TrendingUp, Zap } from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { cn } from '@/lib/utils';
import AnimatedBrandName from '@/components/AnimatedBrandName';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if we should focus search (passed from splash)
    if (window.location.hash === '#focus-search') {
      setTimeout(() => {
        searchInputRef.current?.focus();
        // Clean up hash
        window.history.replaceState(null, '', window.location.pathname);
      }, 600);
    }
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
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [searchQuery, products]);

  return (
    <div className="bg-background min-h-screen pb-40">
      {/* Search Bar at Top */}
      <section className="px-4 pt-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <AlternatingSearchIcon />
            </div>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search for vibes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/5 border-2 border-black/10 focus:border-black/30 rounded-2xl py-4 pl-16 pr-4 outline-none transition-all font-bold text-sm text-black placeholder:text-black/20"
            />
          </div>
      </section>

      {/* App-like Welcome */}
      <section className="px-4 pt-8 pb-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-8">
            <RegalDiamond size={100} className="hidden sm:flex relative z-[60]" />
            <div>
              <h1 className="text-4xl sm:text-8xl font-brand font-medium uppercase tracking-[0.4em] flex flex-col leading-none">
                <span className="text-black/20">THE</span>
                <span className="luxury-text-gradient font-black -mt-2">FEED</span>
              </h1>
              <p className="text-[9px] font-medium text-black/40 uppercase tracking-[0.3em] mt-4 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-black/10" />
                Crafted to be your natural companion
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-end justify-center px-3 py-1 bg-black/5 rounded-xl border border-black/10">
              <span className="text-[8px] font-black uppercase tracking-widest text-black/40">Database Status</span>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", products.length > 0 ? "bg-green-400" : "bg-yellow-400")} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-black">
                  {isLoading ? "Connecting..." : `${products.length} Products`}
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => console.log("Current Products State:", products)}
              className="text-[8px] opacity-20 hover:opacity-100"
            >
              DEBUG LOG
            </Button>
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer">
              <Sparkles className="w-5 h-5 text-[#F7E08A]" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Banner */}
      <section className="px-4 mb-10">
        <div className="relative h-48 rounded-3xl overflow-hidden bg-black flex items-center p-8">
          <div className="absolute inset-0 opacity-50">
            <img 
              src="https://picsum.photos/seed/hero/800/400" 
              alt="Hero" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="eager"
              {...({ fetchPriority: "high" } as any)}
            />
          </div>
          <div className="relative z-10">
            <div className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-widest inline-block mb-2">
              Limited Edition
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-4">
              COTTON <br /> GOODNESS
            </h2>
            <Link to="/shop">
              <Button size="sm" className="bg-white text-black font-black rounded-full px-6">
                SHOP NOW
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* All Products Section */}
      <section className="mb-10">
        <div className="px-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-black/60" />
            <h2 className="text-xl font-black uppercase tracking-tighter text-black">
              {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
            </h2>
          </div>
          <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">
            {filteredAndSortedProducts.length} Items
          </span>
        </div>

        {filteredAndSortedProducts.length > 0 ? (
          <div className="px-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {filteredAndSortedProducts.map((product, index) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <ProductCard {...product} priority={index < 4} aspectRatio="square" variant="minimal" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-20 text-center">
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlternatingSearchIcon />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-black">No vibes found</h3>
            <p className="text-black/40 text-sm font-bold">Try searching for something else or clear filters.</p>
            <Button 
              variant="link" 
              onClick={() => {
                setSearchQuery('');
              }}
              className="text-black/60 font-black uppercase tracking-widest text-[10px] mt-4"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </section>

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
