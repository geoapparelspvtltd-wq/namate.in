import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Sparkles, Wand2, Download, RefreshCw, ChevronLeft, Image as ImageIcon, Camera, User, ShoppingBag, History, Crown, Lock } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import ProductCard from '@/components/ProductCard';
import { cn } from '@/lib/utils';

const BODY_TYPES = [
  { id: 'slim', name: 'Slim', description: 'Lean build', icon: '👤' },
  { id: 'athletic', name: 'Athletic', description: 'Muscular / Fit', icon: '💪' },
  { id: 'regular', name: 'Regular', description: 'Average build', icon: '🚶' },
  { id: 'large', name: 'Large', description: 'Broad / Solid', icon: '🏋️' },
];

export default function TrialRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, loginWithGoogle } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedBodyType, setSelectedBodyType] = useState(BODY_TYPES[2].id);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [cartoonHistory, setCartoonHistory] = useState<{id: string, image: string, timestamp: number}[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTribeMember = userData?.isTribeMember || false;
  const hasReachedLimit = !isTribeMember && cartoonHistory.length >= 1;

  // Handle pre-selected product from navigation state
  useEffect(() => {
    if (location.state?.tryOnProduct) {
      setSelectedProduct(location.state.tryOnProduct);
      // Clean up state so refresh doesn't keep it if undesired (or keep it if it's fine)
    }
  }, [location.state]);

  // Use saved avatar from profile if available
  useEffect(() => {
    if (userData?.trialAvatarUrl && !selectedImage) {
      setSelectedImage(userData.trialAvatarUrl);
    }
  }, [userData?.trialAvatarUrl]);

  // Save source image as avatar
  const saveAvatarToProfile = async (base64: string) => {
    if (!auth.currentUser) return;
    setIsSavingAvatar(true);
    try {
      const storageRef = ref(storage, `trials/source/${auth.currentUser.uid}/avatar.png`);
      await uploadString(storageRef, base64, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { trialAvatarUrl: downloadUrl }, { merge: true });
      toast.success("Avatar saved for future try-ons!");
    } catch (error) {
      console.error("Avatar Save Error:", error);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Load history from Firestore if logged in, otherwise localStorage
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (auth.currentUser) {
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'trials'),
        orderBy('timestamp', 'desc'),
        limit(12)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          image: doc.data().imageUrl,
          timestamp: doc.data().timestamp?.toDate?.()?.getTime() || Date.now()
        }));
        setCartoonHistory(history);
      });
    } else {
      const saved = localStorage.getItem('namate_trial_room_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCartoonHistory(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }

    return () => unsubscribe?.();
  }, [auth.currentUser]);

  // Cloud Save Helper
  const syncToCloud = async (base64Image: string) => {
    if (!auth.currentUser) return null;
    
    setIsSyncing(true);
    try {
      const timestamp = Date.now();
      const storagePath = `trials/${auth.currentUser.uid}/${timestamp}.png`;
      const storageRef = ref(storage, storagePath);
      
      // Upload to Storage
      await uploadString(storageRef, base64Image, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Save to Firestore
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'trials'), {
        imageUrl: downloadUrl,
        productId: selectedProduct?.id || null,
        productName: selectedProduct?.name || null,
        bodyType: selectedBodyType,
        timestamp: serverTimestamp()
      });
      
      return downloadUrl;
    } catch (error) {
      console.error("Cloud Sync Error:", error);
      toast.error("Failed to save to cloud history");
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  // Save history helper (local + cloud if possible)
  const saveToHistory = async (imageUrl: string) => {
    let finalUrl = imageUrl;
    
    if (auth.currentUser) {
      const cloudUrl = await syncToCloud(imageUrl);
      if (cloudUrl) finalUrl = cloudUrl;
    }

    const newEntry = {
      id: Date.now().toString(),
      image: finalUrl,
      timestamp: Date.now()
    };
    
    if (!auth.currentUser) {
      const updatedHistory = [newEntry, ...cartoonHistory].slice(0, 10);
      setCartoonHistory(updatedHistory);
      localStorage.setItem('namate_trial_room_history', JSON.stringify(updatedHistory));
    }
  };

  // Fetch products for the bottom section
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate?.() || new Date(0)
      }));
      setProducts(firestoreProducts);
      setIsProductsLoading(false);
    }, (error) => {
      console.error("Products Load Error:", error);
      setIsProductsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error('Image size should be less than 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setCartoonImage(null);
        if (auth.currentUser) {
          await saveAvatarToProfile(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCartoon = async () => {
    if (!selectedImage && !prompt) {
      toast.error('Please upload a photo or describe yourself');
      return;
    }

    if (hasReachedLimit) {
      toast.error('Free trial limit reached!', {
        description: 'Upgrade to Tribe for just ₹99 for unlimited try-ons!',
        action: {
          label: 'Upgrade Now',
          onClick: () => navigate('/tribe')
        }
      });
      return;
    }

    setIsGenerating(true);
    try {
      const bodyTypeInfo = BODY_TYPES.find(b => b.id === selectedBodyType);
      
      let productImageBase64 = null;
      if (selectedProduct?.image) {
        try {
          // Convert product image to base64 for Gemini reference
          const response = await fetch(selectedProduct.image);
          const blob = await response.blob();
          productImageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.error("Failed to convert product image to base64:", err);
          // Continue anyway, prompt will still describe the product
        }
      }

      let extraPromptDetails = "";
      if (selectedProduct) {
        extraPromptDetails = `Wearing "${selectedProduct.name}". ${selectedProduct.description || ''}. 
        MUST match the exact color shade and fabric pattern from the product image provided. 
        Body Type: ${bodyTypeInfo?.name}. Ensure the clothing fits realistically on this body structure.`;
      } else {
        extraPromptDetails = `Body: ${bodyTypeInfo?.name}. ${prompt ? `Additional instructions: ${prompt}` : ''}`;
      }

      console.log("Sending request to /api/gemini/cartoonify...");
      const response = await fetch('/api/gemini/cartoonify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: selectedImage,
          productImage: productImageBase64,
          prompt: extraPromptDetails
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        // If it's HTML, describe it better in the error
        if (text.trim().startsWith("<!DOCTYPE html>")) {
           throw new Error("Server returned an HTML page instead of JSON. This usually indicates a 404 or 500 error on the server. Please check the server logs.");
        }
        throw new Error("Server returned non-JSON content type: " + contentType);
      }

      const data = await response.json();
      if (response.ok && data.image) {
        setCartoonImage(data.image);
        await saveToHistory(data.image);
        toast.success('Your transformation is ready!');
      } else {
        console.error("API Error Response Data:", data);
        throw new Error(data.error || data.details || 'Failed to generate image');
      }
    } catch (error: any) {
      console.error('Generation Error Detail:', error);
      toast.error('Failed to create cartoon: ' + error.message, {
        duration: 5000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!cartoonImage) return;
    const link = document.createElement('a');
    link.href = cartoonImage;
    link.download = 'my-cartoon-version.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-32 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Status Indicator */}
        {auth.currentUser && (
          <div className="flex justify-end mb-6">
            <span className="flex items-center gap-1 text-[9px] bg-[#064e3b]/5 text-[#064e3b] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              <History className="w-2.5 h-2.5" />
              Cloud Sync Active
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Side: Upload & Input */}
          <div className="space-y-6">
            <div className="bg-black/[0.02] border-2 border-dashed border-black/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group">
              <AnimatePresence mode="wait">
                {selectedImage ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <img 
                      src={selectedImage} 
                      alt="Selected" 
                      className="max-h-[400px] rounded-2xl object-contain shadow-2xl"
                    />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                      <Camera className="w-8 h-8 text-black/40" />
                      {isSavingAvatar && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <RefreshCw className="w-5 h-5 animate-spin text-black" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold">Upload your photo</p>
                      <p className="text-xs text-black/40">This will be your saved avatar</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold hover:scale-105 transition-transform"
                    >
                      {userData?.trialAvatarUrl ? 'Change Avatar' : 'Choose Image'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Body Type Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase tracking-widest text-black/40">
                Selected for Try-On
              </label>
              {selectedProduct ? (
                <div className="flex items-center gap-4 p-4 bg-black text-white rounded-3xl relative overflow-hidden group">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-bold text-sm tracking-tight line-clamp-1">{selectedProduct.name}</p>
                    <p className="text-[10px] opacity-60">Currently trying on</p>
                  </div>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-black/5 rounded-3xl flex items-center justify-center gap-2 text-black/20">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Select an item below</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase tracking-widest text-black/40">
                Select Body Type (Men)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {BODY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedBodyType(type.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3",
                      selectedBodyType === type.id 
                        ? "border-black bg-black text-white shadow-lg" 
                        : "border-black/5 bg-black/[0.02] hover:border-black/10 text-black/60"
                    )}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{type.name}</p>
                      <p className="text-[10px] opacity-60 font-medium">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold uppercase tracking-widest text-black/40">
                Style Customization (Optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Anime style, realistic 3D, sketches..."
                className="w-full h-32 p-4 bg-black/[0.02] border-2 border-black/5 rounded-2xl focus:border-black/20 outline-none transition-all resize-none text-sm"
              />
              
              <button
                onClick={generateCartoon}
                disabled={isGenerating || isSyncing || (!selectedImage && !prompt)}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl",
                  hasReachedLimit 
                    ? "bg-black/10 text-black/40 cursor-not-allowed border-2 border-dashed border-black/10" 
                    : "bg-black text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                )}
              >
                {hasReachedLimit ? (
                  <>
                    <Lock className="w-5 h-5" />
                    Limit Reached
                  </>
                ) : isGenerating || isSyncing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : cartoonImage ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                {!hasReachedLimit && (isGenerating ? 'Generating...' : isSyncing ? 'Saving to Cloud...' : cartoonImage ? 'Result Ready' : 'Magic Try-On')}
              </button>

              {hasReachedLimit && (
                <Link
                  to="/tribe"
                  className="w-full py-4 bg-liquid-gold text-black rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(255,215,0,0.2)]"
                >
                  <Crown className="w-6 h-6" />
                  Upgrade for ₹99: Unlimited Access
                </Link>
              )}
              
              {cartoonImage && !isGenerating && !isSyncing && !hasReachedLimit && (
                <button
                  onClick={() => {
                    setCartoonImage(null);
                    setSelectedProduct(null);
                  }}
                  className="w-full py-3 border-2 border-black/5 text-black/40 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black/5 transition-all"
                >
                  Try Another Look
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Result */}
          <div className="flex flex-col items-center justify-center gap-6 relative">
            {/* Floating Action Button (Mobile Only) */}
            <div className="fixed bottom-36 right-6 z-[60] lg:hidden">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 bg-black text-white rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center border-2 border-white/20 relative"
              >
                <Camera className="w-7 h-7" />
                 {isSavingAvatar && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {/* Visual pulse for attraction */}
                <div className="absolute -inset-1 rounded-full border-2 border-black/20 animate-ping opacity-20 pointer-events-none" />
              </motion.button>
            </div>

            <div className="w-full aspect-square md:aspect-auto md:h-full min-h-[400px] bg-gradient-to-br from-[#FFD1DC]/20 via-[#B2E2F2]/20 to-[#E0BBE4]/20 rounded-[40px] border-2 border-black/5 flex items-center justify-center p-8 relative overflow-hidden shadow-inner">
               {/* Decorative Background */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_100%)] opacity-50" />
               
               <AnimatePresence mode="wait">
                 {cartoonImage ? (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="relative z-10 flex flex-col items-center gap-6"
                   >
                     <div className="relative group/result">
                        <img 
                          src={cartoonImage} 
                          alt="Cartooned" 
                          className="max-h-[500px] rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.2)] border-4 border-white"
                        />
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/result:opacity-100 transition-opacity" />
                     </div>
                              <div className="flex gap-4">
                        <button 
                          onClick={downloadImage}
                          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Save Result
                        </button>
                        <button 
                          onClick={() => setCartoonImage(null)}
                          className="p-3 bg-white border border-black/10 rounded-full shadow-lg hover:bg-black/5 transition-all"
                        >
                          <RefreshCw className="w-5 h-5 text-black" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-4 text-center opacity-30">
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-black/20 flex items-center justify-center">
                           <ImageIcon className="w-10 h-10" />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-sm">
                          {isGenerating ? 'MAGIC IN PROGRESS...' : 'RESULT WILL APPEAR HERE'}
                        </p>
                      </div>

                      {/* My Gallery Preview (Thumbnails) */}
                      {cartoonHistory.length > 0 && !isGenerating && (
                        <div className="absolute bottom-8 left-8 right-8 z-10">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 mb-2 px-1 text-center">My Gallery</p>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 justify-center">
                            {cartoonHistory.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setCartoonImage(item.image)}
                                className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/50 shadow-lg flex-shrink-0 hover:scale-110 active:scale-95 transition-all"
                              >
                                <img src={item.image} alt="Previous" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </AnimatePresence>

               {/* Shimmer effect when generating */}
               {isGenerating && (
                 <motion.div 
                   initial={{ x: '-100%' }}
                   animate={{ x: '100%' }}
                   transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 z-20"
                 />
               )}
            </div>

            {/* Trial Room Info */}
            <div className="p-6 bg-black/[0.01] border border-black/5 rounded-3xl w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  How it works
                </h3>
                {!isTribeMember && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-black/5 text-black/40 rounded-full">
                    1 Free Trial Included
                  </span>
                )}
              </div>
              <p className="text-sm text-black/50 leading-relaxed">
                Our advanced AI analyzes your features and creates a photorealistic version of you wearing selected apparel. Upload a clear, well-lit photo for the best results.
                {!isTribeMember && (
                  <span className="block mt-2 font-bold text-black/60">
                    Get unlimited access for just ₹99 with Tribe.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mt-24 border-t border-black/5 pt-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Try These On</h2>
            </div>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors">
              View Collection
            </Link>
          </div>

          {isProductsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-[3/4] bg-black/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {products.map((product) => (
                <div key={product.id} className="group relative flex flex-col gap-4">
                  <div className="relative">
                    <ProductCard {...product} />
                    {/* Try On Button Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all pointer-events-none z-30">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedProduct(product);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          toast.success(`Trying on ${product.name}`);
                        }}
                        className="w-full py-3 bg-white text-black rounded-xl font-black uppercase tracking-tighter text-xs shadow-2xl pointer-events-auto hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        Try it on
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 && !isProductsLoading && (
            <div className="text-center py-20 bg-black/[0.02] rounded-3xl border-2 border-dashed border-black/5">
              <p className="text-black/40 font-bold uppercase tracking-widest text-sm text-center">
                New arrivals coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
