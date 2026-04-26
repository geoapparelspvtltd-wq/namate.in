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
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import BrandSignature from '@/components/BrandSignature';

export default function ManageGallery() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const [images, setImages] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-20 sm:h-24 bg-black text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-black/90 transition-all shadow-2xl shadow-black/20 flex flex-col items-center justify-center gap-1 group"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mb-1" />
                  SHARPENING...
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
                className="group relative aspect-[4/5] rounded-[32px] overflow-hidden bg-black/5 border border-black/5 hover:border-black/20 transition-all"
              >
                <img 
                  src={img.url} 
                  alt={img.caption} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {img.category && (
                      <span className="text-[8px] font-black uppercase tracking-widest bg-white text-black px-2 py-0.5 rounded">
                        {img.category}
                      </span>
                    )}
                    {img.subcategory && (
                      <span className="text-[8px] font-black uppercase tracking-widest border border-white/20 text-white px-2 py-0.5 rounded">
                        {img.subcategory}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-black uppercase tracking-tighter text-lg leading-tight mb-4">
                    {img.caption}
                  </p>
                  <button 
                    onClick={() => handleDelete(img.id)}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    REMOVE FROM GALLERY
                  </button>
                </div>

                <div className="absolute top-4 right-4 text-[8px] font-black text-white/40 uppercase tracking-widest bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.createdAt.toLocaleDateString()}
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
