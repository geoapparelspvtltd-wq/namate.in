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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1,
            filter: "blur(4px)",
            transition: { duration: 0.4, ease: "easeOut" }
          }}
          className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none"
        >
          {/* Full Screen Splash Photo */}
          <img 
            src={splashImageUrl} 
            className="absolute inset-0 w-full h-full object-cover" 
            alt="Brand Splash"
            referrerPolicy="no-referrer"
          />

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
                className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur text-black rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white border border-black/5 shadow-lg active:scale-95 transition-all"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-[#C5A059]" />}
                Edit Splash Image
              </button>
              <button 
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="p-2 bg-red-600/90 backdrop-blur text-white rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-lg border border-red-500/10"
                title="Remove Splash Image"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
