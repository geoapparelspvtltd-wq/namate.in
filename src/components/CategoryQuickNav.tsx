import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ChevronRight, Edit2 } from 'lucide-react';

interface CategoryQuickNavProps {
  categories: {
    name: string;
    imageUrl?: string;
    subcategories?: string[];
  }[];
  isAdmin?: boolean;
}

import { triggerHaptic } from '@/lib/haptics';

const CategoryQuickNav = ({ categories, isAdmin }: CategoryQuickNavProps) => {
  if (categories.length === 0) return null;

  return (
    <div className="mb-16">
      <div className="px-4 mb-6 flex items-center justify-between">
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
        {categories.map((cat, idx) => {
          const pattern = [3, 3, 6, 2, 2, 2]; // spans in a 6-col grid
          const span = pattern[idx % pattern.length] || 2;
          const isFullWidth = span === 6;
          const isSmall = span === 2;
          
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "group relative flex flex-col h-full bg-white border-r-[0.5px] border-b-[0.5px] border-[#e5e5e5]",
                span === 3 ? "col-span-3" : span === 6 ? "col-span-6" : "col-span-2"
              )}
            >
              <div className="flex flex-col h-full relative">
                <Link 
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col flex-grow"
                >
                  <div className={cn(
                    "relative overflow-hidden bg-gray-50 flex items-center justify-center",
                    isFullWidth ? "aspect-[16/9] sm:aspect-[21/9]" : 
                    isSmall ? "aspect-square sm:aspect-[4/5]" : 
                    "aspect-[3/4] sm:aspect-[4/5]"
                  )}>
                    {cat.imageUrl ? (
                      <img 
                        src={cat.imageUrl} 
                        alt={cat.name} 
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
                        {cat.name.charAt(0)}
                      </div>
                    )}
                    
                    {/* View Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                  </div>
                  
                  <div className={cn(
                    "p-3 sm:p-4 flex flex-col",
                    isSmall && "p-2"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-bold uppercase tracking-[0.2em] text-black/70",
                        isSmall ? "text-[8px]" : "text-[11px]"
                      )}>
                        {cat.name}
                      </span>
                      {!isSmall && <ChevronRight className="w-3 h-3 text-black/20 group-hover:text-black transition-colors" />}
                    </div>
                    {isFullWidth && (
                      <span className="text-[9px] font-bold text-black/30 uppercase tracking-tighter">
                        Explore Full Collection
                      </span>
                    )}
                  </div>
                </Link>

                {isAdmin && (
                  <Link
                    to="/manage-categories"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('medium');
                    }}
                    className="absolute top-2 right-2 z-[40] w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                )}

                {/* Subcategories list */}
                {!isSmall && cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="px-3 sm:px-4 pb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subcategories.slice(0, isFullWidth ? 10 : 4).map(sub => (
                        <Link
                          key={sub}
                          to={`/shop?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                          }}
                          className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 bg-black/5 hover:bg-black hover:text-white rounded-full transition-all"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryQuickNav;
