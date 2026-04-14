import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Plus, 
  Image as ImageIcon, 
  X, 
  Check,
  IndianRupee,
  Type,
  Eye,
  Sparkles,
  Trash2,
  Settings2,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandSignature from '@/components/BrandSignature';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, compressImage } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, auth as firebaseAuth, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { seedProducts } from '@/lib/seedService';
import { toast } from 'sonner';
import { Video, Play, Upload, Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo: firebaseAuth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Firestore Error (${operationType}): ${errInfo.error}`);
}

export default function AddProduct() {
  const navigate = useNavigate();
  const { user, role, loading, loginWithGoogle } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'manage' && isAdmin) {
      fetchProducts();
    }
  }, [activeTab, isAdmin]);

  const fetchProducts = async () => {
    setIsFetchingProducts(true);
    try {
      const q = query(collection(db, 'products'));
      const querySnapshot = await getDocs(q);
      const products = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(0)
        };
      });
      
      // Sort client-side
      products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setExistingProducts(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    } finally {
      setIsFetchingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success("Product deleted successfully");
      setExistingProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete product");
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    } finally {
      setIsLoading(true); // Keep loading state for a moment to prevent double clicks
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#011c16] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-8">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center">Access Denied</h1>
        <p className="text-white/40 font-medium text-center mb-10 max-w-xs">
          {user ? "You do not have permission to access the seller dashboard." : "Please log in to access the seller dashboard."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {!user && (
            <Button 
              onClick={() => loginWithGoogle()}
              className="w-full h-16 bg-[#011c16] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-black transition-all"
            >
              LOGIN WITH GOOGLE
            </Button>
          )}
          <Button 
            onClick={() => navigate('/')}
            className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-[#011c16] transition-all"
          >
            BACK TO HOME
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full h-12 border-2 border-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-white/40 hover:border-white hover:text-white transition-all"
          >
            FORCE REFRESH
          </Button>
        </div>
      </div>
    );
  }
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    customCategory: '',
    subcategory: '',
    description: '',
    videoUrl: '',
    images: [],
    isPremium: false
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>(['T-Shirts', 'Shirts', 'Hoodies', 'Joggers', 'Accessories', 'Jackets', 'Footwear']);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  
  const sizes = ['S', 'M', 'L', 'XL', 'XXL', 'One Size'];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'products'));
        const querySnapshot = await getDocs(q);
        const existingCats = new Set<string>(['T-Shirts', 'Shirts', 'Hoodies', 'Joggers', 'Accessories', 'Jackets', 'Footwear']);
        querySnapshot.docs.forEach(doc => {
          const cat = doc.data().category;
          if (cat) existingCats.add(cat);
        });
        setAllCategories(Array.from(existingCats).sort());
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.images.length + files.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }

    setIsUploading(true);
    
    const readAsDataURL = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      const base64Promises = Array.from(files).map(async (file: File) => {
        const base64 = await readAsDataURL(file);
        // Automatically compress to stay under limit
        return await compressImage(base64, 1000, 1000, 0.6);
      });
      const compressedStrings = await Promise.all(base64Promises);

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...compressedStrings]
      }));
      
      toast.success(`${files.length} photo(s) optimized & added`);
    } catch (error) {
      console.error("Error reading files:", error);
      toast.error("Failed to process images");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'CUSTOM_NEW') {
      setIsCustomCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setIsCustomCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (formData.images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    setIsLoading(true);
    
    try {
      // Upload images to Firebase Storage
      const uploadPromises = formData.images.map(async (base64: string, index: number) => {
        const fileName = `products/${Date.now()}-${index}.jpg`;
        const storageRef = ref(storage, fileName);
        
        // Upload the base64 string
        await uploadString(storageRef, base64, 'data_url');
        
        // Get the download URL
        return await getDownloadURL(storageRef);
      });

      toast.info("Uploading images...");
      console.log("Starting image uploads...");
      const imageUrls = await Promise.all(uploadPromises);
      console.log("Image uploads complete:", imageUrls);

      const finalCategory = isCustomCategory ? formData.customCategory.trim() : formData.category;

      if (!finalCategory) {
        toast.error("Please select or enter a category");
        setIsLoading(false);
        return;
      }

      const productData = {
        name: formData.name.trim(),
        price: Number(formData.price),
        category: finalCategory,
        subcategory: formData.subcategory.trim(),
        description: formData.description.trim(),
        videoUrl: formData.videoUrl.trim(),
        image: imageUrls[0], // Set the main image
        images: imageUrls,
        sizes: selectedSizes,
        isPremium: formData.isPremium,
        isNew: true,
        createdAt: serverTimestamp()
      };

      console.log("Attempting to add document to Firestore 'products' collection...");
      const docRef = await addDoc(collection(db, 'products'), productData);
      console.log("Product successfully published with ID:", docRef.id);
      
      toast.success("Product published successfully!");
      navigate('/shop');
    } catch (error: any) {
      console.error("Publish error:", error);
      const errorMessage = error.message || "Failed to publish product";
      
      if (errorMessage.includes("quota")) {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please ensure you are logged in as admin.");
      } else if (error.code === 'resource-exhausted' || errorMessage.includes("too large")) {
        toast.error("Product data is too large. Try using smaller images.");
      } else {
        toast.error(errorMessage);
      }
      
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("This will add 4 sample products to your store. Continue?")) return;
    
    setIsLoading(true);
    const toastId = toast.loading("Seeding store...");
    try {
      await seedProducts();
      toast.success("Store seeded with sample products!", { id: toastId });
      navigate('/shop');
    } catch (error: any) {
      console.error("Seed error:", error);
      const msg = error.message || "Unknown error";
      toast.error(`Failed to seed store: ${msg}`, { id: toastId });
      
      if (msg.includes("permission")) {
        toast.error("Permission denied. Ensure you are logged in as admin.");
      } else if (msg.includes("offline")) {
        toast.error("Database is offline. Please check your Firebase configuration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-90"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-white">Seller Hub</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSeed}
              disabled={isLoading}
              variant="outline"
              className="h-9 sm:h-10 border-2 border-dashed border-white/20 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:border-white transition-all px-3 sm:px-4 bg-transparent text-white"
            >
              Seed
            </Button>
            {activeTab === 'add' && (
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                  showPreview ? "bg-[#011c16] text-white" : "bg-white/10 text-white/70"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{showPreview ? 'Editing' : 'Preview'}</span>
                <span className="xs:hidden">{showPreview ? 'Edit' : 'View'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab('add')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'add' ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/60"
            )}
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Add
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'manage' ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white/60"
            )}
          >
            <Settings2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Manage
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'manage' ? (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto px-4 py-8"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter">Your Inventory</h2>
              <button 
                onClick={fetchProducts}
                className="text-[10px] font-black uppercase tracking-widest text-[#011c16] hover:underline"
              >
                Refresh List
              </button>
            </div>

            {isFetchingProducts ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Loading Inventory...</p>
              </div>
            ) : existingProducts.length === 0 ? (
              <div className="py-20 text-center bg-white/5 rounded-[40px] border-2 border-dashed border-white/10">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-white/10" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-white">No products yet</h3>
                <p className="text-xs text-white/40 font-bold mb-6">Start by adding your first piece to the tribe.</p>
                <Button onClick={() => setActiveTab('add')} className="bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-[10px]">
                  ADD PRODUCT
                </Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="bg-white/5 rounded-[24px] sm:rounded-[32px] border-2 border-white/5 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group hover:border-white/20 transition-all"
                  >
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden bg-white/10 flex-shrink-0">
                      <img 
                        src={product.images?.[0] || product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5 sm:mb-1">{product.category}</p>
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-tighter truncate mb-0.5 sm:mb-1 text-white">{product.name}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-white/60">₹{product.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={isLoading}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : showPreview ? (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto px-4 py-12"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-[#F7E08A] rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" />
                Live Preview
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">How it looks to the tribe</h2>
            </div>
            
            <div className="max-w-[280px] mx-auto">
              <ProductCard 
                id="preview-id"
                name={formData.name || 'Product Name'}
                price={Number(formData.price) || 0}
                image={formData.images[0] || ''}
                images={formData.images}
                category={formData.category || 'Category'}
                isNew={true}
                description={formData.description}
                sizes={selectedSizes}
              />
            </div>

            <div className="mt-12 p-6 bg-white/5 rounded-[32px] border-2 border-dashed border-white/10">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Quick Specs</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-white/20 uppercase">Category</span>
                  <span className="uppercase text-white">{formData.category || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-white/20 uppercase">Sizes</span>
                  <span className="uppercase text-white">{selectedSizes.length > 0 ? selectedSizes.join(', ') : 'None selected'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-white/20 uppercase">Images</span>
                  <span className="uppercase text-white">{formData.images.length} Photos</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowPreview(false)}
              className="w-full mt-8 h-14 bg-white border-2 border-black text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
            >
              BACK TO EDITING
            </Button>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleSubmit} 
            className="max-w-2xl mx-auto px-4 py-8 space-y-8"
          >
            {/* Image Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-white/40">Product Images ({formData.images.length}/4)</Label>
                {isUploading && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-[#011c16] animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    UPLOADING...
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="aspect-[3/4] rounded-[24px] sm:rounded-[32px] bg-white/5 border-2 border-white/10 flex items-center justify-center relative overflow-hidden group">
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </button>
                    </div>
                    {idx === 0 && (
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white text-black text-[7px] sm:text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                        Main Cover
                      </div>
                    )}
                  </div>
                ))}
                
                {formData.images.length < 4 && (
                  <button 
                    type="button"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="aspect-[3/4] rounded-[24px] sm:rounded-[32px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/30 hover:bg-white/5 transition-all group disabled:opacity-50"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-white/20 group-hover:text-white" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/20">
                      {isUploading ? '...' : 'Upload'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-white/40">Product Name</Label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Namate Oversized Tee" 
                    className="pl-12 h-14 rounded-2xl border-2 border-white/10 bg-white/5 focus:border-white/30 transition-all font-bold text-white placeholder:text-white/10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-white/40">Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input 
                      id="price" 
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="999" 
                      className="pl-12 h-14 rounded-2xl border-2 border-white/10 bg-white/5 focus:border-white/30 transition-all font-bold text-white placeholder:text-white/10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-white/40">Category</Label>
                  <div className="space-y-3">
                    <Select onValueChange={handleCategoryChange} required={!isCustomCategory}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 border-white/10 bg-white/5 focus:border-white/30 transition-all font-bold text-white">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-white/10 bg-[#01261e] text-white">
                        {allCategories.map(cat => (
                          <SelectItem key={cat} value={cat} className="font-bold py-3 hover:bg-white/10">{cat}</SelectItem>
                        ))}
                        <div className="h-[1px] bg-white/10 my-1" />
                        <SelectItem value="CUSTOM_NEW" className="font-bold py-3 text-green-400 hover:bg-white/10">
                          + Add New Category...
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <AnimatePresence>
                      {isCustomCategory && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="relative"
                        >
                          <Input 
                            id="customCategory" 
                            value={formData.customCategory}
                            onChange={handleInputChange}
                            placeholder="Type new category (e.g. Shirts)" 
                            className="h-14 rounded-2xl border-2 border-[#011c16] focus:border-black transition-all font-bold"
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setIsCustomCategory(false)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-red-400 hover:underline"
                          >
                            Cancel
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Premium Toggle */}
              <div className="bg-white/5 border-2 border-white/10 rounded-[32px] p-6 flex items-center justify-between group hover:border-[#011c16]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#011c16]/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-[#011c16]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-white">Premium Collection</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Promote to Regal Page</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium }))}
                  className={cn(
                    "w-14 h-8 rounded-full relative transition-all duration-300",
                    formData.isPremium ? "bg-[#011c16]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-lg",
                    formData.isPremium ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory" className="text-xs font-black uppercase tracking-widest text-white/40">Subcategory (Optional)</Label>
                <div className="relative">
                  <Settings2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input 
                    id="subcategory" 
                    value={formData.subcategory}
                    onChange={handleInputChange}
                    placeholder="e.g. Oversized, Slim Fit, Cotton" 
                    className="pl-12 h-14 rounded-2xl border-2 border-white/5 focus:border-white/20 transition-all font-bold bg-white/5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl" className="text-xs font-black uppercase tracking-widest text-gray-400">Video Showcase URL (Optional)</Label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="videoUrl" 
                    value={formData.videoUrl}
                    onChange={handleInputChange}
                    placeholder="e.g. https://example.com/video.mp4" 
                    className="pl-12 h-14 rounded-2xl border-2 border-white/5 focus:border-white/20 transition-all font-bold bg-white/5"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold px-2">Direct link to .mp4 or YouTube/Vimeo link</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-gray-400">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell the tribe about this piece..." 
                  className="min-h-[120px] rounded-2xl border-2 border-white/5 focus:border-white/20 transition-all font-bold p-4 bg-white/5"
                  required
                />
              </div>
            </div>

            {/* Premium Collection Toggle */}
            <div className="p-6 bg-white/5 rounded-[32px] border-2 border-white/10 flex items-center justify-between group hover:border-[#064e3b]/30 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  formData.isPremium ? "bg-[#064e3b] text-white" : "bg-white/5 text-white/20"
                )}>
                  <Crown className={cn("w-6 h-6", formData.isPremium && "animate-pulse")} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white">Promote to Regal</h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mark as Premium Collection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium }))}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300",
                  formData.isPremium ? "bg-[#064e3b]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300",
                  formData.isPremium ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Available Sizes</Label>
              <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "py-3 sm:px-6 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-2",
                      selectedSizes.includes(size)
                        ? "bg-black border-black text-white"
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8">
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-[#064e3b] transition-all relative overflow-hidden group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    PUBLISHING...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    PUBLISH PRODUCT
                  </div>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <BrandSignature variant="dark" className="mt-12 mb-20 opacity-20" />
    </div>
  );
}
