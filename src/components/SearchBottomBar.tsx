import { memo, useState, useEffect, useRef } from 'react';
import { useSearch } from '@/lib/SearchContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';

const SearchBottomBar = memo(() => {
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch some products for search if we don't have them
  useEffect(() => {
    if (products.length === 0) {
      const fetchSearchData = async () => {
        try {
          const q = query(collection(db, 'products'), limit(100));
          const snap = await getDocs(q);
          setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          console.error("Search fetch error:", error);
        }
      };
      fetchSearchData();
    }
  }, []);

  const filteredResults = searchQuery.length >= 2 
    ? products.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [searchQuery]);
  
  const isReelMode = location.pathname.startsWith('/product/');
  const visible = !isReelMode;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-[380px] pointer-events-none">
          {/* Dropdown Results */}
          <AnimatePresence>
            {isDropdownOpen && filteredResults.length > 0 && (
              <motion.div 
                ref={dropdownRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full mb-3 left-0 right-0 bg-white/90 backdrop-blur-3xl border border-black/[0.03] rounded-[32px] overflow-hidden shadow-2xl pointer-events-auto"
              >
                <div className="p-2 space-y-1">
                  <div className="px-4 py-2 flex items-center justify-between border-b border-black/5 mb-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black/40">Results for "{searchQuery}"</span>
                    <button 
                      onClick={() => setIsDropdownOpen(false)}
                      className="text-black/40 hover:text-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {filteredResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        navigate(`/product/${product.id}`);
                        setIsDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-black/5 transition-colors text-left group"
                    >
                      <div className="w-12 h-12 rounded-xl border border-black/[0.03] overflow-hidden bg-black/5 shrink-0">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-[10px] font-black uppercase tracking-tight text-black line-clamp-1">{product.name}</h4>
                        <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest">{product.category}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-black/20 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}

                  <button 
                    onClick={() => {
                      navigate(`/shop?q=${encodeURIComponent(searchQuery)}`);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#C5A059] hover:bg-black/5 transition-all text-center border-t border-black/5 mt-1"
                  >
                    View all matching items
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="pointer-events-auto"
          >
            <div className="bg-white/80 backdrop-blur-2xl border border-black/[0.03] rounded-full px-6 py-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.05)] flex items-center gap-4 relative overflow-hidden">
              {/* Subtle Shine */}
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] pointer-events-none"
              />
              
              <Search className="w-4 h-4 text-[#C5A059] shrink-0" />
              
              <input 
                ref={inputRef}
                type="text" 
                placeholder='SEARCH "DENIM"' 
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.length >= 2) setIsDropdownOpen(true);
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/shop?q=${encodeURIComponent(searchQuery)}`);
                    setIsDropdownOpen(false);
                  }
                }}
                className="flex-grow bg-transparent border-none outline-none text-black font-black text-[9px] uppercase tracking-[0.3em] placeholder:text-black/20"
              />

              <AnimatePresence mode="wait">
                {searchQuery ? (
                   <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-3"
                  >
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="text-black/40 hover:text-black transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-black/10" />
                    <button 
                      onClick={() => {
                        if (searchQuery.trim()) {
                          navigate(`/shop?q=${encodeURIComponent(searchQuery)}`);
                          setIsDropdownOpen(false);
                        }
                      }}
                      className="flex items-center gap-1.5 text-[#C5A059] group"
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest hidden sm:block">SEARCH</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

export default SearchBottomBar;
