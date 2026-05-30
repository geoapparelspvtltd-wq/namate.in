import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWishlist } from '@/lib/WishlistContext';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, Heart, Sparkles, Wand2 } from 'lucide-react';

// Web audio retro camera shutter sound designer
const playShutterSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Shutter crisp noise
    const bufferSize = ctx.sampleRate * 0.12; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(6000, now + 0.08);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Mechanical latch oscillation
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.04);
    
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    noiseNode.start(now);
    osc.start(now);
    
    noiseNode.stop(now + 0.12);
    osc.stop(now + 0.04);
  } catch (error) {
    console.warn("Audio context bypass warning:", error);
  }
};

export default function ScreenshotWishlistListener() {
  const location = useLocation();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [showFlash, setShowFlash] = useState(false);
  const [capturedProduct, setCapturedProduct] = useState<any | null>(null);

  const handleCapture = (product: any) => {
    if (!product) return;

    // Check if or trigger addition to wishlist
    const alreadyWishlisted = isInWishlist(product.id);
    if (!alreadyWishlisted) {
      toggleWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
        images: product.images || [product.image]
      } as any);
    }

    // Capture flash & sound feedback
    triggerHaptic('success');
    playShutterSound();
    setShowFlash(true);
    setCapturedProduct(product);
    setTimeout(() => setShowFlash(false), 300);

    // Gorgeous Toast
    toast.custom((t) => (
      <div className="flex animate-fade-in relative bg-black border border-[#C5A059]/30 rounded-2xl p-3.5 shadow-2xl items-center gap-3.5 w-full max-w-sm pointer-events-auto selection:bg-none">
        <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0">
          <img 
            src={product.image || (product.images && product.images[0])} 
            alt={product.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <Camera className="w-4 h-4 text-[#C5A059] animate-pulse" />
          </div>
        </div>
        <div className="flex-1 text-left">
          <span className="text-[7.5px] font-black uppercase tracking-[0.25em] text-[#C5A059] block mb-0.5">📸 Snapshot Captured</span>
          <h4 className="text-white text-[10px] font-black uppercase tracking-tight line-clamp-1">{product.name}</h4>
          <p className="text-[#C5A059] font-bold text-[8.5px] uppercase mt-0.5 tracking-wider">Saved to Wishlist</p>
        </div>
        <button 
          onClick={() => {
            toast.dismiss(t);
            triggerHaptic('light');
          }}
          className="text-white/40 hover:text-white text-[9.5px] font-bold uppercase tracking-widest pl-2 border-l border-white/15"
        >
          Dismiss
        </button>
      </div>
    ), { duration: 4000 });
  };

  useEffect(() => {
    // 1. Keyboard Shortcut Hook
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen Key
      const isPrtScn = e.key === 'PrintScreen';
      
      // Mac shortcut (Cmd + Shift + 3 or Cmd + Shift + 4)
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.code === 'Digit3' || e.code === 'Digit4');
      
      // Windows Snipping (Meta/Ctrl + Shift + S)
      const isWinScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS');

      if (isPrtScn || isMacScreenshot || isWinScreenshot) {
        // Find visible active product context
        // Check if on detail page
        const match = location.pathname.match(/\/product\/([^/]+)/);
        if (match) {
          // Trigger a custom event to fetch detail page product
          const event = new CustomEvent('request-product-screenshot');
          window.dispatchEvent(event);
        } else {
          // On other pages, find the most visible product card or use custom dispatched trigger
          const cardEl = document.querySelector('.group:hover');
          if (cardEl) {
            const simulatedClick = cardEl.querySelector('[data-screenshot-target]');
            if (simulatedClick instanceof HTMLElement) {
              simulatedClick.click();
            }
          }
        }
      }
    };

    // 2. Custom Dispatch simulation listener
    const handleSimulatedScreenshot = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.product) {
        handleCapture(customEvent.detail.product);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('simulate-screenshot', handleSimulatedScreenshot);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('simulate-screenshot', handleSimulatedScreenshot);
    };
  }, [location, toggleWishlist, isInWishlist]);

  return (
    <AnimatePresence>
      {showFlash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed inset-0 bg-white z-[500] pointer-events-none flex items-center justify-center"
        >
          {/* Polaroid Snap visual feedback */}
          <div className="w-20 h-20 rounded-full border-4 border-black flex items-center justify-center animate-ping">
            <Camera className="w-10 h-10 text-black" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
