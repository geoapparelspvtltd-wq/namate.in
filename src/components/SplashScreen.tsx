import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Camera, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { compressImage } from '@/lib/utils';
import { toast } from 'sonner';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { isNative, splashImageUrl, updateSplashImage, role, user, loading: authLoading, maintenanceLoading } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  // Config check is fully loaded
  const isLoaded = !authLoading && !maintenanceLoading;

  useEffect(() => {
    if (isLoaded) {
      if (!splashImageUrl) {
        // No custom splash screen photo is set, so load directly and skip the animation delays entirely!
        setIsVisible(false);
        onComplete();
      }
    }
  }, [isLoaded, splashImageUrl, onComplete]);

  useEffect(() => {
    if (!isVisible) return;

    // Fine linear loader bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2.5;
      });
    }, 45);

    // Elegant timer to fade out and call completion callback
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 450);
    }, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isVisible, onComplete]);

  // Shield any initial load flicker using clean off-white background
  if (!isLoaded) {
    return <div className="fixed inset-0 z-[9999] bg-[#F7F4F0]" />;
  }

  // If no photo is set, skip rendering
  if (!splashImageUrl) {
    return null;
  }

  const handleUpdatePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const toastId = toast.loading("Compressing and uploading new splash photo...");
    try {
      const file = files[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 1200, 1200, 0.6);
      await updateSplashImage(compressed);
      toast.success("Splash screen photo updated successfully!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update custom splash photo.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Are you sure you want to remove the custom splash screen? The site will load directly in the future.")) return;
    setIsUploading(true);
    const toastId = toast.loading("Removing custom splash screen...");
    try {
      await updateSplashImage('');
      toast.success("Splash image deleted. Site will now directly load.", { id: toastId });
    } catch (e) {
      toast.error("Failed to delete splash image.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const brandChars = ["N", "A", "M", "A", "T", "E"];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.02,
            filter: "blur(6px)",
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between py-12 px-6 overflow-hidden select-none"
        >
          {/* Blur ambient background of the actual splash image */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <img 
              src={splashImageUrl} 
              className="w-full h-full object-cover blur-2xl scale-110" 
              alt=""
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="absolute inset-0 pointer-events-none bg-black/60 z-[1]" />

          {/* Admin controls container */}
          {isAdmin && (
            <div className="absolute top-6 right-6 z-[10000] flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUpdatePhoto} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur text-black rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white border border-black/5 shadow-lg active:scale-95 transition-all"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-[#C5A059]" />}
                Edit Splash Image
              </button>
              <button 
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="p-2 bg-red-600/95 backdrop-blur text-white rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-lg border border-red-500/10"
                title="Remove Splash Image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Minimal luxurious Header */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-between items-center w-full max-w-xs mx-auto z-10"
          >
            <span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-white/40">PREMIUM COTTON & LINEN</span>
            <span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-white/40">EST. 2026</span>
          </motion.div>

          {/* Luxury Portrait Cards Core Canvas */}
          <div className="flex flex-col items-center justify-center relative z-10 space-y-6">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-[84%] max-w-[280px] aspect-[11/16] rounded-[32px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] bg-neutral-900 border border-white/10 relative group"
            >
              <img 
                src={splashImageUrl} 
                className="w-full h-full object-cover" 
                alt="Brand Lifestyle Splash"
                referrerPolicy="no-referrer"
              />

              {/* Seamless gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Small branding labels positioned directly inside lookbook slide */}
              <div className="absolute bottom-6 inset-x-0 px-6 text-center space-y-2">
                <div className="flex items-center justify-center gap-1">
                  {brandChars.map((char, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + (index * 0.05), duration: 0.6 }}
                      className="text-white font-brand font-black text-xl tracking-[0.1em]"
                    >
                      {char}
                    </motion.span>
                  ))}
                </div>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#C5A059] -mr-[0.4em]">
                  HANDCRAFTED APPAREL
                </p>
              </div>
            </motion.div>
          </div>

          {/* Progress loader and Slogan Footers */}
          <div className="w-full max-w-xs mx-auto flex flex-col items-center space-y-5 relative z-10">
            {/* Fine single-pixel line loader */}
            <div className="w-full h-[1.5px] bg-white/10 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-[#C5A059]"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center text-center space-y-2.5"
            >
              <span className="text-[8px] font-black uppercase tracking-[0.35em] text-white/55">
                CRAFTED TO BE
              </span>
              <div className="w-8 h-[1px] bg-[#C5A059] opacity-75" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white">
                YOUR NATURAL COMPANION.
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
