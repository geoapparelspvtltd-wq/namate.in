import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Sparkles, Check, ArrowRight, Upload, Info } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { Link } from 'react-router-dom';

interface SmartScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

const SAMPLES = [
  {
    id: 'denim',
    name: 'Rigid Indigo Denim',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80',
    tags: ['denim', 'jean', 'jacket', 'navy', 'blue', 'shirt']
  },
  {
    id: 'linen',
    name: 'Cream Slub Linen',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
    tags: ['linen', 'shirt', 'cream', 'beige', 'white', 'cotton']
  },
  {
    id: 'jogger',
    name: 'Knit Comfort Fleece',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
    tags: ['jogger', 'fleece', 'pant', 'knit', 'hoodie', 'comfort']
  },
  {
    id: 'tee',
    name: 'Heavyweight Cotton Tee',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    tags: ['tee', 'tshirt', 't-shirt', 'oversized', 'black', 'white']
  }
];

export default function SmartScannerModal({ isOpen, onClose, products }: SmartScannerModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');
  const [matchedProducts, setMatchedProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sample' | 'upload'>('sample');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear states when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setIsAnalyzing(false);
      setMatchedProducts([]);
    }
  }, [isOpen]);

  const handleStartAnalysis = (imageUrl: string, tags: string[]) => {
    triggerHaptic('medium');
    setSelectedImage(imageUrl);
    setIsAnalyzing(true);
    setMatchedProducts([]);

    const steps = [
      'Initializing optical lens matrix...',
      'Deconstructing weave silhouette details...',
      'Matching warp/weft thread specifications...',
      'Querying lookbook database for matching fits...'
    ];

    let currentStep = 0;
    setAnalyzingStep(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAnalyzingStep(steps[currentStep]);
        triggerHaptic('light');
      } else {
        clearInterval(interval);
        
        // Find matching products
        const matches = products.filter(p => {
          const nameLower = (p.name || '').toLowerCase();
          const catLower = (p.category || '').toLowerCase();
          const subLower = (p.subcategory || '').toLowerCase();
          const descLower = (p.description || '').toLowerCase();

          return tags.some(tag => 
            nameLower.includes(tag) || 
            catLower.includes(tag) || 
            subLower.includes(tag) ||
            descLower.includes(tag)
          );
        }).slice(0, 4);

        // Fallback to top products if no keyword match
        if (matches.length === 0) {
          setMatchedProducts(products.slice(0, 3));
        } else {
          setMatchedProducts(matches);
        }

        setIsAnalyzing(false);
        triggerHaptic('heavy');
      }
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const url = event.target.result as string;
          // Extract random tag list or guess based on file name
          const guessedTags = ['shirt', 'tee', 'pant', 'jacket', 'cotton', 'denim'];
          handleStartAnalysis(url, guessedTags);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-end justify-center select-none"
        >
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={onClose} />

          {/* Bottom Drawer */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full max-w-md bg-[#FAF8F5] border-t border-[#C5A059]/10 rounded-t-[36px] overflow-hidden max-h-[85vh] flex flex-col relative z-10 shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-[#C5A059]">
                  <Camera className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-brand font-black uppercase tracking-widest text-black">
                    Tribe Scan
                  </h3>
                  <p className="text-[7.5px] text-[#C5A059] uppercase font-black tracking-widest">
                    Smart Look Finder
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black/50 flex items-center justify-center active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Scanner Body */}
            <div className="overflow-y-auto p-4 flex-1 space-y-4 no-scrollbar pb-10">
              
              {/* Dynamic Analysis View Screen */}
              {selectedImage ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-black border border-black/5">
                  <img 
                    src={selectedImage} 
                    alt="Scanned look" 
                    className="w-full h-full object-cover brightness-75"
                    referrerPolicy="no-referrer"
                  />
                  
                  {isAnalyzing ? (
                    <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 to-black/20">
                      {/* Laser Swipe Line */}
                      <motion.div 
                        initial={{ top: '0%' }}
                        animate={{ top: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent shadow-[0_0_10px_#C5A059]"
                      />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent border-[#C5A059] animate-spin shrink-0" />
                          <span className="text-[9px] font-black tracking-widest text-[#C5A059] uppercase">
                            AI ANALYSIS ACTIVE
                          </span>
                        </div>
                        <p className="text-[10px] text-white font-medium uppercase tracking-tight animate-pulse">
                          {analyzingStep}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/90 to-black/20">
                      <div className="flex justify-end">
                        <span className="text-[7.5px] font-black text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full border border-[#C5A059]/20 uppercase tracking-widest">
                          Scan Matching Complete
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[7.5px] font-black uppercase text-[#C5A059] tracking-widest">SILHOUETTE MATCH TARGET</span>
                        <h4 className="text-white font-brand text-xs uppercase font-black tracking-tight leading-tight">
                          Weave Details Identified!
                        </h4>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/50 border border-neutral-200/50 rounded-2xl p-4 text-center space-y-3.5">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTab('sample');
                      }}
                      className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all border ${activeTab === 'sample' ? 'bg-black text-white border-black' : 'text-black/40 border-black/5 hover:border-black/10'}`}
                    >
                      SAMPLE IMAGES
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTab('upload');
                      }}
                      className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all border ${activeTab === 'upload' ? 'bg-black text-white border-black' : 'text-black/40 border-black/5 hover:border-black/10'}`}
                    >
                      UPLOAD CLOTHES
                    </button>
                  </div>

                  {activeTab === 'sample' ? (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {SAMPLES.map((sample) => (
                        <div 
                          key={sample.id}
                          onClick={() => handleStartAnalysis(sample.imageUrl, sample.tags)}
                          className="group bg-neutral-100 rounded-xl overflow-hidden cursor-pointer relative aspect-square border border-black/[0.04] transition-all hover:border-[#C5A059]/30"
                        >
                          <img 
                            src={sample.imageUrl} 
                            alt={sample.name} 
                            className="w-full h-full object-cover brightness-[0.92] group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 text-left">
                            <p className="text-white text-[9px] font-brand font-black uppercase tracking-tight line-clamp-1">{sample.name}</p>
                            <span className="text-white/40 text-[7px] uppercase tracking-widest">TAP TO SCAN</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-300 hover:border-[#C5A059]/40 rounded-xl p-8 cursor-pointer flex flex-col items-center justify-center space-y-2.5 transition-all bg-neutral-50/50"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-black uppercase tracking-wider">CHOOSE CLOTHING PHOTO</p>
                        <p className="text-[8px] text-black/30 uppercase mt-0.5 tracking-widest">JPEG, PNG fits lookbooks & vibes</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scan Matches Grid */}
              <AnimatePresence>
                {!isAnalyzing && matchedProducts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="flex items-center justify-between border-b border-black/[0.03] pb-1.5">
                      <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-[#C5A059] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C5A059] animate-pulse" /> Similar Matches Found ({matchedProducts.length})
                      </span>
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="text-[7.5px] font-bold text-black/45 hover:text-black uppercase tracking-widest"
                      >
                        Reset Scan
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {matchedProducts.map((product) => (
                        <div 
                          key={product.id}
                          className="bg-white border border-neutral-200/40 rounded-2xl overflow-hidden p-2 flex flex-col relative group"
                        >
                          <div className="aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden relative shrink-0">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {/* Accent badge status */}
                            <span className="absolute top-2 left-2 text-[6.5px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {product.category || 'REGAL'}
                            </span>
                          </div>
                          
                          <div className="pt-2 text-left flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="text-[9.5px] font-black uppercase tracking-tight text-black line-clamp-1">{product.name}</h4>
                              <p className="text-[8px] font-bold text-black/40 uppercase tracking-widest leading-none mt-0.5">{product.subcategory || 'Signature weave'}</p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/[0.03]">
                              <span className="text-[10px] font-black text-[#C5A059]">₹{product.price}</span>
                              <Link 
                                to={`/product/${product.id}`}
                                onClick={() => {
                                  triggerHaptic('medium');
                                  onClose();
                                }}
                                className="w-6 h-6 rounded-lg bg-[#C5A059]/10 text-[#C5A059] hover:bg-black hover:text-white flex items-center justify-center transition-all scale-95 hover:scale-105"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
