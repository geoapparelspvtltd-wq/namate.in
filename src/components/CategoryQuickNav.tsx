import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface CategoryQuickNavProps {
  categories: {
    name: string;
    imageUrl?: string;
  }[];
}

const CategoryQuickNav = ({ categories }: CategoryQuickNavProps) => {
  if (categories.length === 0) return null;

  return (
    <div className="py-8 bg-white border-b border-black/5">
      <div className="px-4 mb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Shop by Category</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex-shrink-0"
          >
            <Link 
              to={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-black/5 shadow-sm active:scale-95 transition-all group-hover:shadow-md group-hover:border-black/10">
                {cat.imageUrl ? (
                  <img 
                    src={cat.imageUrl} 
                    alt={cat.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full flex items-center justify-center font-black text-2xl uppercase select-none transition-transform group-hover:scale-110",
                    idx % 3 === 0 ? "bg-gradient-to-br from-[#FFDEE9] to-[#B5FFFC]" : 
                    idx % 3 === 1 ? "bg-gradient-to-br from-[#8BC6EC] to-[#9599E2]" :
                    "bg-gradient-to-br from-[#FBAB7E] to-[#F7CE68]",
                    "text-white drop-shadow-md"
                  )}>
                    {cat.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter text-black truncate max-w-[80px]">
                {cat.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryQuickNav;
