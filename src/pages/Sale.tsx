import { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TrendingUp, Zap, Sparkles, Percent } from 'lucide-react';
import { motion } from 'motion/react';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';

export default function Sale() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error("Error fetching products:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Top Sale: Products with highest discount
  const topSaleProducts = [...products]
    .filter(p => p.discount)
    .sort((a, b) => (b.discount || 0) - (a.discount || 0))
    .slice(0, 4);

  // Trending: New products
  const trendingProducts = products.filter(p => p.isNew).slice(0, 4);

  // All Sale Items
  const allSaleItems = products.filter(p => p.discount);

  return (
    <div className="bg-background min-h-screen">
      {/* Header Section */}
      <section className="px-4 pt-6 pb-8">
        <div className="bg-white/5 rounded-[40px] p-8 relative overflow-hidden shadow-2xl shadow-white/5 border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <RegalDiamond size={32} />
              <span className="text-xs font-black uppercase tracking-widest text-white/80">Season Steals</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">
              THE BIG <br /> <span className="liquid-gold-text">DROP</span>
            </h1>
            <p className="text-white/90 text-sm font-bold max-w-[200px]">Up to 50% off on your favorite Namate vibes.</p>
          </div>
          <div className="absolute bottom-0 right-0 p-4">
            <span className="text-8xl font-black text-white/10 leading-none">50%</span>
          </div>
        </div>
      </section>

      {/* Top Sale Section */}
      <section className="mb-12">
        <div className="px-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-white/60" />
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Top Sale</h2>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-2 py-1 rounded-md">
            Biggest Discounts
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {topSaleProducts.map((product) => (
            <div key={product.id} className="w-48 flex-shrink-0">
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section className="mb-12">
        <div className="px-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white/60" />
            <h2 className="text-xl font-black uppercase tracking-tighter text-white">Trending Now</h2>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-white/60" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Hot Picks</span>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {trendingProducts.map((product) => (
            <div key={product.id} className="w-48 flex-shrink-0">
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </section>

      {/* All Sale Items Grid */}
      <section className="mb-10">
        <div className="px-4 mb-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-white">All Sale Items</h2>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
            {allSaleItems.length} Items on discount
          </p>
        </div>

        <div className="px-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {allSaleItems.map((product) => (
            <div key={product.id}>
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </section>
      <BrandSignature variant="dark" className="mb-20 opacity-30" />
    </div>
  );
}
