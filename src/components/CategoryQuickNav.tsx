import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ChevronRight, Edit2, ChevronLeft } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface CategoryQuickNavProps {
  categories: {
    name: string;
    imageUrl?: string;
    subcategories?: string[];
  }[];
  isAdmin?: boolean;
}

const CategoryQuickNav = ({ categories, isAdmin }: CategoryQuickNavProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      triggerHaptic('light');
    }
  };

  return (
    <div className="mb-14 px-4 sm:px-6">
      <div className="mb-5 flex items-end justify-between">
        <div className="flex flex-col">
          <h2 className="text-xs font-black text-black uppercase tracking-[0.25em]">Shop by Category</h2>
          <span className="text-[9px] text-black/40 font-bold uppercase tracking-widest mt-0.5">Slide to explore collections</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link 
              to="/manage-categories"
              className="flex items-center gap-1.5 text-[9px] font-black text-[#C5A059] uppercase tracking-widest hover:opacity-80 transition-opacity mr-1"
            >
              <Edit2 className="w-2.5 h-2.5" />
              Manage
            </Link>
          )}
          {/* Slider controls for desktop/mouse users */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button 
              onClick={() => scroll('left')}
              className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm active:scale-95 bg-white/50 backdrop-blur"
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-7 h-7 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm active:scale-95 bg-white/50 backdrop-blur"
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Sliding Container */}
      <div className="relative group">
        <div 
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto gap-4 py-2 px-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat, idx) => {
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04, duration: 0.4 }}
                className="snap-start shrink-0"
              >
                <Link 
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center group/card"
                >
                  {/* Small Box Container */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-black/15 shadow-sm hover:shadow transition-all duration-500 flex items-center justify-center p-2">
                    {cat.imageUrl ? (
                      <img 
                        src={cat.imageUrl} 
                        alt={cat.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={cn(
                        "w-full h-full rounded-2xl flex items-center justify-center font-black uppercase text-2xl transition-transform duration-700 group-hover/card:scale-110",
                        idx % 3 === 0 ? "bg-gradient-to-br from-[#FFDEE9] to-[#B5FFFC]" : 
                        idx % 3 === 1 ? "bg-gradient-to-br from-[#8BC6EC] to-[#9599E2]" :
                        "bg-gradient-to-br from-[#FBAB7E] to-[#F7CE68]",
                        "text-white"
                      )}>
                        {cat.name.charAt(0)}
                      </div>
                    )}
                    
                    {/* View Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/5 rounded-2xl transition-colors duration-300" />
                  </div>
                  
                  {/* Name Label */}
                  <div className="mt-2 text-center px-1 max-w-[96px] sm:max-w-[112px]">
                    <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-800 transition-colors group-hover/card:text-black truncate">
                      {cat.name}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryQuickNav;
