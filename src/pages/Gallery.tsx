import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Camera, Loader2, Sparkles, X, ChevronRight, Share2, Filter, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandSignature from '@/components/BrandSignature';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Gallery() {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = ['ALL', 'T-Shirts', 'Shirts', 'Hoodies', 'Joggers', 'Accessories', 'Jackets', 'Footwear'];

  useEffect(() => {
    const q = query(collection(db, 'store_gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setImages(gImages);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching gallery:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredImages = images.filter(img => 
    activeCategory === 'ALL' || img.category === activeCategory
  );

  const handleShare = (img: any) => {
    if (navigator.share) {
      navigator.share({
        title: 'Namate Lookbook',
        text: img.caption,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lookbook link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-black animate-spin mb-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Curating Lookbook...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Editorial Header */}
      <section className="pt-24 pb-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-black rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-6">
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            Volume 01
          </div>
          <h1 className="text-6xl sm:text-9xl font-brand font-medium uppercase tracking-tight text-black leading-none mb-4">
            LOOKBOOK
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-[0.4em] max-w-lg mx-auto leading-relaxed">
            A visual diary of the Namate Tribe. Crafted stories, captured moments, and the frequency of authentic vibes.
          </p>
        </motion.div>
      </section>

      {/* Category Filter */}
      <section className="px-4 mb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-4 h-4 text-black/20" />
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Filter by Vibes</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                  activeCategory === cat 
                    ? "bg-black border-black text-white shadow-xl shadow-black/10 scale-105" 
                    : "bg-white border-black/5 text-black/40 hover:border-black/20 hover:text-black"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry-style Grid */}
      <section className="px-4 pb-40 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {filteredImages.map((img, idx) => (
            <motion.div
              key={img.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 4) * 0.1 }}
              onClick={() => setSelectedImage(img)}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-[32px] bg-black/5",
                idx % 5 === 0 ? "aspect-[4/6] scale-105" : "aspect-[4/5]"
              )}
            >
              <img 
                src={img.url} 
                alt={img.caption || ''} 
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-6 flex flex-col justify-end">
                <div className="flex flex-wrap gap-2 mb-2">
                  {img.category && (
                    <span className="text-[8px] font-black uppercase tracking-widest bg-white text-black px-2 py-0.5 rounded">
                      {img.category}
                    </span>
                  )}
                </div>
                <p className="text-white font-black uppercase tracking-tighter text-sm mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  {img.caption}
                </p>
                <div className="h-[1px] w-0 group-hover:w-full bg-white/20 transition-all duration-700 mb-4" />
                <div className="flex items-center justify-between text-[8px] font-black text-white/40 uppercase tracking-widest">
                  <span>{img.createdAt.toLocaleDateString()}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="py-20 text-center">
            <h3 className="text-xl font-black uppercase tracking-tighter text-black/20 italic">No stories found for this mood...</h3>
            <Button 
              variant="link" 
              onClick={() => setActiveCategory('ALL')}
              className="text-[10px] font-black uppercase tracking-widest mt-4 text-black/40"
            >
              View All Stories
            </Button>
          </div>
        )}
      </section>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-20"
          >
            <div className="absolute top-8 right-8 z-10">
              <button 
                onClick={() => setSelectedImage(null)}
                className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all shadow-xl active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar px-4 pb-32">
              <div className="max-w-4xl mx-auto py-12">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-[48px] overflow-hidden shadow-2xl mb-12 shadow-black/10"
                >
                  <img 
                    src={selectedImage.url} 
                    alt={selectedImage.caption} 
                    className="w-full h-auto"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 px-4">
                  <div>
                    <div className="flex items-center flex-wrap gap-3 mb-4">
                      <Camera className="w-5 h-5 text-black/20" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Namate Vision</span>
                      {selectedImage.category && (
                        <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded">
                          {selectedImage.category}
                        </span>
                      )}
                      {selectedImage.subcategory && (
                        <span className="px-2 py-0.5 border border-black/10 text-black/40 text-[8px] font-black uppercase tracking-widest rounded">
                          {selectedImage.subcategory}
                        </span>
                      )}
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-brand font-medium uppercase tracking-tighter text-black leading-none max-w-xl">
                      {selectedImage.caption}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleShare(selectedImage)}
                      className="w-16 h-16 rounded-3xl bg-black flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-xl shadow-black/20"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="mt-20 flex flex-col items-center">
                  <BrandSignature variant="dark" className="opacity-10 scale-75" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 py-12 pointer-events-none">
        <BrandSignature variant="dark" className="opacity-10" />
      </div>
    </div>
  );
}
