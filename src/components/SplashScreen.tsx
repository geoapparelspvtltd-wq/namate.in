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
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  // Config check is fully loaded
  const isLoaded = !authLoading && !maintenanceLoading;

  // Preload custom splash image if present
  useEffect(() => {
    if (!splashImageUrl) {
      setImageLoaded(false);
      return;
    }
    const img = new Image();
    img.src = splashImageUrl;
    img.onload = () => {
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback in case of image load error
      setImageLoaded(true);
    };
  }, [splashImageUrl]);

  useEffect(() => {
    // Wait until Firestore is loaded and (if splashImageUrl is set) wait for browser to finish downloading the image bytes
    const readyToStart = isLoaded && (!splashImageUrl || imageLoaded);
    if (!isVisible || !readyToStart) return;

    // Elegant and premium timeline for progress
    const duration = 1600; // 1.6 seconds for premium presentation of the uploaded creative image
    const stepTime = 16;
    const totalSteps = duration / stepTime;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / totalSteps);
      });
    }, stepTime);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 350);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isVisible, isLoaded, imageLoaded, splashImageUrl, onComplete]);

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1,
            filter: "blur(4px)",
            transition: { duration: 0.3, ease: "easeOut" }
          }}
          className="fixed inset-0 z-[9999] bg-[#0A0A09] overflow-hidden select-none"
        >
          {/* While still checking Firestore or preloading image, show a minimal loading spinner to avoid layout jumps */}
          {(!isLoaded || (splashImageUrl && !imageLoaded)) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0C0A09]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin opacity-40" />
                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] pl-[0.4em]">
                  NAMATE
                </p>
              </div>
            </div>
          ) : splashImageUrl ? (
            <div className="absolute inset-0 w-full h-full">
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                src={splashImageUrl} 
                className="absolute inset-0 w-full h-full object-cover" 
                alt="Brand Splash"
                referrerPolicy="no-referrer"
              />
              {/* Luxury Progress Bar centered horizontally on custom image */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-black/10 backdrop-blur-md rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.05 }}
                  className="h-full bg-[#C5A059] rounded-full"
                />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0C0A09]">
              <div className="flex flex-col items-center gap-5">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-20 h-20 bg-white/[0.03] rounded-[24px] flex items-center justify-center p-4 shadow-3xl border border-white/10"
                >
                  <img
                    src="https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png"
                    className="w-full h-full object-contain invert transform scale-105 select-none pointer-events-none"
                    alt="Namate Logo"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
                
                <div className="text-center">
                  <motion.h1 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                    className="text-2xl font-black text-white tracking-[0.45em] uppercase font-sans leading-none pl-[0.45em]"
                  >
                    NAMATE
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-[9px] font-black text-white uppercase tracking-[0.38em] mt-2.5 pl-[0.38em] leading-none"
                  >
                    The Clothing Frequency
                  </motion.p>
                </div>
              </div>
              
              {/* Luxury Progress Bar centered horizontally */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.05 }}
                  className="h-full bg-[#C5A059] rounded-full"
                />
              </div>
            </div>
          )}

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
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/95 backdrop-blur text-black rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white border border-black/5 shadow-lg active:scale-95 transition-all"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-[#C5A059]" />}
                Edit Splash Image
              </button>
              {splashImageUrl && (
                <button 
                  onClick={handleRemovePhoto}
                  disabled={isUploading}
                  className="p-2.5 bg-red-600/95 backdrop-blur text-white rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-lg border border-red-500/10"
                  title="Remove Splash Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
