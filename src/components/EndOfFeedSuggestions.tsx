import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, TrendingUp, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface EndOfFeedSuggestionsProps {
  currentCategory?: string | null;
  currentSubcategory?: string | null;
  allSubcategories: string[];
  allCategories: string[];
  onSelectSubcategory: (sub: string) => void;
  onSelectCategory: (cat: string) => void;
}

export default function EndOfFeedSuggestions({ 
  currentCategory, 
  currentSubcategory, 
  allSubcategories, 
  allCategories,
  onSelectSubcategory,
  onSelectCategory
}: EndOfFeedSuggestionsProps) {
  
  // Filter out the current active one from suggestions
  const suggestedSubcategories = allSubcategories
    .filter(sub => sub !== currentSubcategory)
    .slice(0, 6);

  const suggestedCategories = allCategories
    .filter(cat => cat !== currentCategory)
    .slice(0, 4);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-24 pb-20 border-t border-black/5"
    >
      <div className="pt-16 px-4">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-12 h-12 bg-[#C5A059]/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[#C5A059]" />
          </div>
          <h2 className="text-xl font-black text-black uppercase tracking-tighter mb-2">
            You've reached the end
          </h2>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-[0.2em]">
            But the vibe carries on. Discover more.
          </p>
        </div>

        {/* Suggest Subcategories */}
        {suggestedSubcategories.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-[#C5A059]" />
              <h3 className="text-xs font-bold text-black uppercase tracking-[0.3em]">Next in Feed</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {suggestedSubcategories.map((sub, idx) => (
                <button
                  key={sub}
                  onClick={() => {
                    triggerHaptic('medium');
                    onSelectSubcategory(sub);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-between p-5 bg-white border border-black/5 hover:border-black transition-all rounded-[24px] h-20 text-left active:scale-[0.98]"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/70">{sub}</span>
                  <ChevronRight className="w-4 h-4 text-black/20" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggest Other Categories */}
        {suggestedCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Compass className="w-4 h-4 text-[#C5A059]" />
              <h3 className="text-xs font-bold text-black uppercase tracking-[0.3em]">Explore Vibe Changes</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestedCategories.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => {
                    triggerHaptic('medium');
                    onSelectCategory(cat);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group relative h-28 overflow-hidden rounded-[24px] bg-black group active:scale-[0.98] transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
                  <div className="absolute inset-0 flex items-center px-8 z-20">
                    <div className="text-left">
                      <h4 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-[#C5A059] transition-colors">{cat}</h4>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Change Collection Vibe</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/20 ml-auto group-hover:text-white transition-all transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 flex justify-center">
          <Link 
            to="/" 
            onClick={() => triggerHaptic('medium')}
            className="text-[10px] font-black text-black/30 hover:text-black uppercase tracking-[0.4em] transition-colors"
          >
            ← Back to Main Home
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
