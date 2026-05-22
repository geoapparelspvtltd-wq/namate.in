import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Camera,
  Loader2,
  X,
  Check,
  Type,
  LayoutGrid,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, compressImage } from '@/lib/utils';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import BrandSignature from '@/components/BrandSignature';

export default function ManageGallery() {
  const navigate = useNavigate();
  const { user, role, loading, isNative, requestImagePick } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const [images, setImages] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allCategories = ['T-Shirts', 'Shirts', 'Hoodies', 'Joggers', 'Accessories', 'Jackets', 'Footwear'];

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/profile');
      return;
    }

    const q = query(collection(db, 'store_gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setImages(gImages);
      setIsFetching(false);
    }, (error) => {
      console.error("Error fetching gallery:", error);
      toast.error("Failed to load gallery images");
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [isAdmin, loading]);

  useEffect(() => {
    if (!isNative) return;

    const handleNativeImage = async (event: any) => {
      const { data } = event.detail;
      const base64 = data?.image || data?.base64 || data?.data;
      
      if (!base64) return;

      setIsUploading(true);
      const toastId = toast.loading("Adding from app...");

      try {
        const formattedBase64 = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
        const compressed = await compressImage(formattedBase64, 1200, 1200, 0.6);
        
        await addDoc(collection(db, 'store_gallery'), {
          url: compressed,
          caption: caption || 'Lifestyle Shot',
          category: category || null,
          subcategory: subcategory || null,
          createdBy: user?.uid,
          createdAt: serverTimestamp()
        });

        toast.success("Image added to gallery", { id: toastId });
        setCaption('');
      } catch (error) {
        console.error("Native Gallery Error:", error);
        toast.error("Failed to add image", { id: toastId });
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener('flutterImageSuccess' as any, handleNativeImage);
    return () => window.removeEventListener('flutterImageSuccess' as any, handleNativeImage);
  }, [isNative, caption, category, subcategory, user]);

  const uploadImages = async (files: FileList) => {
    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} lifestyle shot(s)...`);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const compressed = await compressImage(base64, 1200, 1200, 0.6);
        
        return addDoc(collection(db, 'store_gallery'), {
          url: compressed,
          caption: caption || 'Lifestyle Shot',
          category: category || null,
          subcategory: subcategory || null,
          createdBy: user?.uid,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(uploadPromises);

      toast.success(`${files.length} images added to gallery`, { id: toastId });
      
      // Reset form if success
      setCaption('');
      // We keep category/subcategory for "Add More" convenience if they are uploading a batch for a category
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to add image(s)", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    uploadImages(files);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this image from the gallery?")) return;
    
    try {
      await deleteDoc(doc(db, 'store_gallery', id));
      toast.success("Image removed");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove image");
    }
  };

  const handleEdit = (img: any) => {
    setEditingImage(img);
    setCaption(img.caption || '');
    setCategory(img.category || 'NONE');
    setSubcategory(img.subcategory || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async () => {
    if (!editingImage) return;
    setIsUploading(true);
    const toastId = toast.loading("Updating image details...");

    try {
      await setDoc(doc(db, 'store_gallery', editingImage.id), {
        caption: caption || 'Lifestyle Shot',
        category: category === 'NONE' ? null : category,
        subcategory: subcategory || null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Details updated!", { id: toastId });
      setEditingImage(null);
      setCaption('');
      setCategory('');
      setSubcategory('');
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update details", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Lookbook</h1>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Manage lifestyle gallery</p>
            </div>
          </div>
        </div>

        {/* Upload Interface */}
        <section className="bg-black/5 rounded-[40px] p-8 mb-12 border-2 border-black/5">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black uppercase tracking-widest text-black">
                {editingImage ? "Edit Image Details" : "Upload Lifestyle shots"}
              </h2>
              {editingImage && (
                <button 
                  onClick={() => {
                    setEditingImage(null);
                    setCaption('');
                    setCategory('');
                    setSubcategory('');
                  }}
                  className="text-[10px] font-black uppercase text-red-500 hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {editingImage && (
              <div className="w-24 h-32 rounded-2xl overflow-hidden mb-2">
                <img src={editingImage.url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Image Caption</Label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <Input 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. Summer Collection '26"
                    className="pl-12 h-14 rounded-2xl border-none bg-white text-black font-bold focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Category Link</Label>
                <div className="relative">
                  <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 z-10" />
                  <Select onValueChange={setCategory} value={category}>
                    <SelectTrigger className="pl-12 h-14 rounded-2xl border-none bg-white text-black font-bold focus:ring-2 focus:ring-black/10">
                      <SelectValue placeholder="Link Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2 border-black/10 bg-white text-black">
                      <SelectItem value="NONE" className="font-bold py-3 hover:bg-black/5 text-black/40">No Category</SelectItem>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat} className="font-bold py-3 hover:bg-black/5">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Sub-category (Optional)</Label>
              <div className="relative">
                <Tags className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <Input 
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g. Oversized, Streetwear"
                  className="pl-12 h-14 rounded-2xl border-none bg-white text-black font-bold focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            <Button 
              onClick={() => {
                if (editingImage) {
                  handleUpdate();
                } else if (isNative) {
                  toast.info("Opening app lookbook picker...");
                  requestImagePick('gallery');
                  // Fallback after 3s
                  setTimeout(() => {
                    if (!isUploading) {
                      toast.info("Fallback: using local files");
                      fileInputRef.current?.click();
                    }
                  }, 3000);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={isUploading}
              className="w-full h-20 sm:h-24 bg-black text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-black/90 transition-all shadow-2xl shadow-black/20 flex flex-col items-center justify-center gap-1 group"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mb-1" />
                  {editingImage ? 'SAVING...' : 'SHARPENING...'}
                </>
              ) : editingImage ? (
                <>
                  <Check className="w-6 h-6" />
                  <span>SAVE CHANGES</span>
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span>UPLOAD LIFESTYLE SHOTS</span>
                  <span className="text-[10px] opacity-40 normal-case font-medium">Select one or more images</span>
                </>
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] flex-grow bg-black/10" />
              <button 
                onClick={() => {
                  setCaption('');
                  setCategory('');
                  setSubcategory('');
                  toast.success("Ready for new batch!");
                }}
                className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
              >
                Clear Form
              </button>
              <div className="h-[1px] flex-grow bg-black/10" />
            </div>
          </div>
        </section>

        {/* Grid Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {images.map((img) => (
              <motion.div 
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-[4/5] rounded-[32px] overflow-hidden bg-black/5 border border-black/5 hover:border-black/20 transition-all shadow-sm hover:shadow-xl duration-500"
              >
                <img 
                  src={img.url} 
                  alt={img.caption} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />

                {/* Permanent Overlay for Quick Actions / Always Visible on Admin View */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                  <div className="flex gap-1.5">
                    {img.category && (
                      <span className="text-[8px] font-black uppercase tracking-widest bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-full shadow-sm">
                        {img.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(img);
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-black hover:bg-black hover:text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
                      title="Edit details"
                    >
                      <Type className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id);
                      }}
                      className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Overlay with details */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity p-6 flex flex-col justify-end pointer-events-none">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {img.subcategory && (
                      <span className="text-[8px] font-black uppercase tracking-widest bg-white/10 backdrop-blur text-white/90 px-2 py-0.5 rounded border border-white/10">
                        {img.subcategory}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-black uppercase tracking-tighter text-base leading-tight mb-3">
                    {img.caption}
                  </p>
                  
                  {/* Subtle date display */}
                  <div className="text-[8px] font-bold text-white/50 uppercase tracking-widest">
                    Added {img.createdAt instanceof Date ? img.createdAt.toLocaleDateString() : 'recently'}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {images.length === 0 && !isFetching && (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-10 h-10 text-black/10" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-black/20">The gallery is empty</h3>
            <p className="text-black/10 text-xs font-bold uppercase tracking-widest mt-2">Start adding lifestyle shots above</p>
          </div>
        )}
      </div>

      <BrandSignature variant="dark" className="opacity-20 mt-12" />
    </div>
  );
}
