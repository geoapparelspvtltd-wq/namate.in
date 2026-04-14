import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crown, Star, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ProductCard from '@/components/ProductCard';
import AnimatedBrandName from '@/components/AnimatedBrandName';
export default function Regal() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const premiumProducts = products.filter(p => p.isPremium);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black pb-32">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.05)_0%,transparent_70%)] opacity-40" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10 px-4 flex flex-col items-center"
        >
          <Crown className="w-12 h-12 text-[#C5A059] mb-6" />
          <h1 className="text-5xl sm:text-8xl font-heading font-black uppercase tracking-tighter mb-4 flex items-center justify-center gap-4">
            <AnimatedBrandName text="REGAL" className="text-[#C5A059]" />
          </h1>
          <p className="text-xl text-black/60 max-w-2xl mx-auto font-medium">
            The pinnacle of the Namate experience. Exclusive access for our most dedicated members.
          </p>
        </motion.div>
      </section>

      {/* Premium Shop Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-black">Premium Collection</h2>
          </div>
          <div className="hidden sm:block h-1 flex-grow bg-gradient-to-r from-black/10 to-transparent ml-8" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
          {premiumProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-b from-black/5 to-transparent rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <ProductCard {...product} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Star, title: "VIP Access", desc: "Early access to limited edition drops before anyone else." },
            { icon: Zap, title: "Instant Shipping", desc: "Your orders are prioritized and shipped within 12 hours." },
            { icon: ShieldCheck, title: "Lifetime Warranty", desc: "Regal members get lifetime support on all apparel." },
            { icon: Crown, title: "Custom Designs", desc: "Ability to request custom colorways on select items." }
          ].map((benefit, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-8 border border-black/10 rounded-3xl bg-black/5 hover:bg-black/10 transition-colors"
            >
              <benefit.icon className="w-10 h-10 text-[#C5A059] mb-6" />
              <h3 className="text-xl font-black uppercase mb-4 text-black">{benefit.title}</h3>
              <p className="text-black/60 text-sm font-medium leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center py-20">
        <div className="p-12 border-4 border-black/10 rounded-[40px] relative overflow-hidden">
          <div className="absolute inset-0 bg-black/5" />
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-6 relative z-10 text-black">READY TO ASCEND?</h2>
          <p className="text-lg text-black/60 mb-10 relative z-10">
            Join the Regal tier for ₹999/year and unlock the full potential of Namate.
          </p>
          <Button size="lg" className="bg-black text-white font-black px-12 py-8 text-2xl rounded-none hover:scale-105 transition-transform relative z-10">
            UPGRADE TO REGAL
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </section>
    </div>
  );
}
