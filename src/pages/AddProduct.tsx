import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import Cropper from 'react-easy-crop';
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
  Crown,
  MoveUp,
  MoveDown,
  Crop as CropIcon,
  Video,
  Play,
  Upload,
  Loader2
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
import { cn, compressImage, getCroppedImg, getYoutubeEmbedUrl } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { seedProducts } from '@/lib/seedService';
import { toast } from 'sonner';

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
  const { id } = useParams();
  const { user, role, loading, loginWithGoogle } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'manage' && isAdmin) {
      fetchProducts();
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (id && isAdmin) {
      const fetchProductForEdit = async () => {
        setIsLoading(true);
        try {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            handleEditProduct({ id: docSnap.id, ...docSnap.data() });
          } else {
            toast.error("Product not found");
            navigate('/add-product');
          }
        } catch (error) {
          console.error("Error fetching product for edit:", error);
          toast.error("Failed to load product data");
        } finally {
          setIsLoading(false);
        }
      };
      fetchProductForEdit();
    } else if (!id && editingProductId) {
      resetForm();
    }
  }, [id, isAdmin]);

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

  const handleEditProduct = (product: any) => {
    setEditingProductId(product.id);
    
    // Construct unified media array from legacy fields
    const media: { id: string, type: 'image' | 'video', url: string }[] = [];
    
    if (product.media && Array.isArray(product.media)) {
      media.push(...product.media.map((m: any, i: number) => ({
        id: m.id || `media-${Date.now()}-${i}`,
        type: m.type,
        url: m.url
      })));
    } else {
      // Fallback to legacy fields
      const videos = product.videoUrls || (product.videoUrl ? [product.videoUrl] : []);
      const images = product.images || (product.image ? [product.image] : []);
      
      videos.forEach((url: string, i: number) => {
        if (url) media.push({ id: `video-${Date.now()}-${i}`, type: 'video', url });
      });
      images.forEach((url: string, i: number) => {
        if (url) media.push({ id: `image-${Date.now()}-${i}`, type: 'image', url });
      });
    }

    setFormData({
      name: product.name || '',
      price: String(product.price) || '',
      category: product.category || '',
      customCategory: '',
      subcategory: product.subcategory || '',
      description: product.description || '',
      badge: product.badge || '',
      media: media,
      galleryMedia: [], // Will be fetched below
      isPremium: product.isPremium || false,
      isUpcoming: product.isUpcoming || false,
      isTribeExclusive: product.isTribeExclusive || false,
      tribeReleaseDate: product.tribeReleaseDate || ''
    });

    // Fetch sub-collection gallery images
    const fetchGallery = async () => {
      try {
        const gallerySnap = await getDocs(query(collection(db, 'products', product.id, 'gallery'), orderBy('createdAt', 'asc')));
        const gallery = gallerySnap.docs.map(doc => ({
          id: doc.id,
          type: 'image' as const,
          url: doc.data().url
        }));
        setFormData(prev => ({ ...prev, galleryMedia: gallery }));
      } catch (error) {
        console.error("Error fetching gallery:", error);
      }
    };
    fetchGallery();

    setSelectedSizes(product.sizes || []);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      price: '',
      category: '',
      customCategory: '',
      subcategory: '',
      description: '',
      badge: '',
      media: [],
      galleryMedia: [],
      isPremium: false,
      isUpcoming: false,
      isTribeExclusive: false,
      tribeReleaseDate: ''
    });
    setSelectedSizes([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
          <X className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center text-black">Access Denied</h1>
        <p className="text-black/40 font-medium text-center mb-10 max-w-xs">
          {user ? "You do not have permission to access the seller dashboard." : "Please log in to access the seller dashboard."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {!user && (
            <Button 
              onClick={() => loginWithGoogle()}
              className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-black/90 transition-all"
            >
              LOGIN WITH GOOGLE
            </Button>
          )}
          <Button 
            onClick={() => navigate('/')}
            className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-black/90 transition-all"
          >
            BACK TO HOME
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full h-12 border-2 border-black/10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-black/40 hover:border-black hover:text-black transition-all"
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
    badge: '',
    media: [] as { id: string, type: 'image' | 'video', url: string }[],
    galleryMedia: [] as { id: string, type: 'image', url: string }[],
    isPremium: false,
    isUpcoming: false,
    isTribeExclusive: false,
    tribeReleaseDate: ''
  });

  const [isGalleryCrop, setIsGalleryCrop] = useState(false);
  const galleryFileInputRef = React.useRef<HTMLInputElement>(null);

  // Cropping State
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = isGallery ? formData.galleryMedia : formData.media.filter(m => m.type === 'image');
    if (currentImages.length + files.length > (isGallery ? 20 : 10)) {
      toast.error(isGallery ? "Maximum 20 gallery images allowed" : "Maximum 10 reel items allowed");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(isGallery ? "Optimizing gallery shots..." : "Optimizing photos...");
    
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
        return await compressImage(base64, 1000, 1000, 0.5);
      });
      const compressedStrings = await Promise.all(base64Promises);

      const newMediaItems = compressedStrings.map((url, i) => ({
        id: `${isGallery ? 'gallery' : 'image'}-${Date.now()}-${i}`,
        type: 'image' as const,
        url
      }));

      setFormData(prev => ({
        ...prev,
        [isGallery ? 'galleryMedia' : 'media']: [...prev[isGallery ? 'galleryMedia' : 'media'], ...newMediaItems]
      }));
      
      toast.success(`${files.length} ${isGallery ? 'gallery' : ''} photo(s) added`, { id: toastId });
    } catch (error) {
      console.error("Error reading files:", error);
      toast.error("Failed to process images", { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, _croppedAreaPixels: any) => {
    setCroppedAreaPixels(_croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels || cropIndex === null) return;
    
    setIsCropping(true);
    try {
      const croppedImage = await getCroppedImg(cropImage, croppedAreaPixels);
      const compressed = await compressImage(croppedImage, 1000, 1000, 0.7);
      
      if (isGalleryCrop) {
        const newGallery = [...formData.galleryMedia];
        newGallery[cropIndex] = { ...newGallery[cropIndex], url: compressed };
        setFormData(prev => ({ ...prev, galleryMedia: newGallery }));
      } else {
        const newMedia = [...formData.media];
        newMedia[cropIndex] = { ...newMedia[cropIndex], url: compressed };
        setFormData(prev => ({ ...prev, media: newMedia }));
      }
      
      setCropImage(null);
      setCropIndex(null);
      toast.success("Image cropped successfully");
    } catch (error: any) {
      console.error("Crop error:", error);
      toast.error(`Failed to crop: ${error.message}`);
    } finally {
      setIsCropping(false);
    }
  };

  const removeMedia = (id: string) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.id !== id)
    }));
  };

  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newMedia = [...formData.media];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newMedia.length) return;
    
    [newMedia[index], newMedia[targetIndex]] = [newMedia[targetIndex], newMedia[index]];
    setFormData(prev => ({ ...prev, media: newMedia }));
  };

  const addVideoUrl = () => {
    const id = `video-${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, { id, type: 'video', url: '' }]
    }));
  };

  const updateVideoUrl = (id: string, url: string) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.map(m => m.id === id ? { ...m, url } : m)
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
    
    const validMedia = formData.media.filter(m => m.url.trim() !== '');
    if (validMedia.length === 0) {
      toast.error("Please add at least one image or video");
      return;
    }

    setIsLoading(true);
    
    try {
      // Use media as-is (base64 data format) as requested
      const finalMedia = validMedia;

      const finalCategory = isCustomCategory ? formData.customCategory.trim() : formData.category;

      const imageUrls = finalMedia.filter(m => m.type === 'image').map(m => m.url);
      const videoUrls = finalMedia.filter(m => m.type === 'video').map(m => m.url);

      const productData: any = {
        name: formData.name.trim(),
        price: Number(formData.price),
        category: finalCategory,
        subcategory: formData.subcategory.trim(),
        description: formData.description.trim(),
        badge: formData.badge.trim(),
        media: finalMedia, // Store unified media
        videoUrls: videoUrls,
        videoUrl: videoUrls[0] || '', // Legacy support
        image: imageUrls[0] || '', // Set the main image
        images: imageUrls,
        sizes: selectedSizes,
        isPremium: formData.isPremium,
        isUpcoming: formData.isUpcoming,
        isTribeExclusive: formData.isTribeExclusive,
        tribeReleaseDate: formData.tribeReleaseDate,
        updatedAt: serverTimestamp()
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productData);
        
        // Handle Gallery Documents (Sub-collection)
        // First delete existing (simple way for this app, since images are base64)
        const oldGallerySnap = await getDocs(collection(db, 'products', editingProductId, 'gallery'));
        await Promise.all(oldGallerySnap.docs.map(d => deleteDoc(d.ref)));
        
        // Add new gallery items
        await Promise.all(formData.galleryMedia.map((m, i) => 
          addDoc(collection(db, 'products', editingProductId, 'gallery'), {
            url: m.url,
            type: 'image',
            order: i,
            createdAt: serverTimestamp()
          })
        ));

        toast.success("Product updated successfully!");
        resetForm();
        setActiveTab('manage');
      } else {
        productData.isNew = true;
        productData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'products'), productData);
        
        // Handle Gallery Documents (Sub-collection)
        await Promise.all(formData.galleryMedia.map((m, i) => 
          addDoc(collection(docRef, 'gallery'), {
            url: m.url,
            type: 'image',
            order: i,
            createdAt: serverTimestamp()
          })
        ));

        toast.success("Product published successfully!");
        resetForm();
        navigate('/shop');
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      const errorMessage = error.message || "Failed to save product";
      
      if (errorMessage.includes("quota")) {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please ensure you are logged in as admin.");
      } else if (error.code === 'resource-exhausted' || errorMessage.includes("too large")) {
        toast.error("Product data is too large. Try using smaller images.");
      } else {
        toast.error(errorMessage);
      }
      
      handleFirestoreError(error, editingProductId ? OperationType.UPDATE : OperationType.CREATE, editingProductId ? `products/${editingProductId}` : 'products');
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
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => {
                if (editingProductId) {
                  resetForm();
                  if (id) navigate('/add-product');
                } else {
                  navigate(-1);
                }
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors active:scale-90"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </button>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-black">
              {editingProductId ? 'Edit Product' : 'Seller Hub'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSeed}
              disabled={isLoading}
              variant="outline"
              className="h-9 sm:h-10 border-2 border-dashed border-black/20 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:border-black transition-all px-3 sm:px-4 bg-transparent text-black"
            >
              Seed
            </Button>
            {activeTab === 'add' && (
              <button 
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                  showPreview ? "bg-black text-white" : "bg-black/5 text-black/70"
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
        <div className="flex bg-black/5 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab('add')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'add' ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black/60"
            )}
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Add
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'manage' ? "bg-black text-white shadow-sm" : "text-black/40 hover:text-black/60"
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
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black">Your Inventory</h2>
              <button 
                onClick={fetchProducts}
                className="text-[10px] font-black uppercase tracking-widest text-black hover:underline"
              >
                Refresh List
              </button>
            </div>

            {isFetchingProducts ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-black/20 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Loading Inventory...</p>
              </div>
            ) : existingProducts.length === 0 ? (
              <div className="py-20 text-center bg-black/5 rounded-[40px] border-2 border-dashed border-black/10">
                <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-black/10" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-black">No products yet</h3>
                <p className="text-xs text-black/40 font-bold mb-6">Start by adding your first piece to the tribe.</p>
                <Button onClick={() => setActiveTab('add')} className="bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-[10px]">
                  ADD PRODUCT
                </Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {existingProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="bg-black/5 rounded-[24px] sm:rounded-[32px] border-2 border-black/5 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 group hover:border-black/20 transition-all"
                  >
                    <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden bg-black/10 flex-shrink-0">
                      <img 
                        src={product.images?.[0] || product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-black/40 mb-0.5 sm:mb-1">{product.category}</p>
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-tighter truncate mb-0.5 sm:mb-1 text-black">{product.name}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-black/60">₹{product.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/5 text-black flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-90"
                      >
                        <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
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
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-black rounded-full text-[10px] font-black uppercase tracking-widest mb-4 text-white">
                <Sparkles className="w-3 h-3" />
                Live Preview
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black">How it looks to the tribe</h2>
            </div>
            
            <div className="max-w-[280px] mx-auto">
              <ProductCard 
                id="preview-id"
                name={formData.name || 'Product Name'}
                price={Number(formData.price) || 0}
                image={formData.media.find(m => m.type === 'image')?.url || ''}
                images={formData.media.filter(m => m.type === 'image').map(m => m.url)}
                videoUrls={formData.media.filter(m => m.type === 'video').map(m => m.url)}
                media={formData.media}
                category={formData.category || 'Category'}
                badge={formData.badge}
                isPremium={formData.isPremium}
                isUpcoming={formData.isUpcoming}
                isTribeExclusive={formData.isTribeExclusive}
                isNew={true}
                description={formData.description}
                sizes={selectedSizes}
              />
            </div>

            <div className="mt-12 p-6 bg-black/5 rounded-[32px] border-2 border-dashed border-black/10">
              <h3 className="text-xs font-black uppercase tracking-widest text-black/40 mb-4">Quick Specs</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black/20 uppercase">Category</span>
                  <span className="uppercase text-black">{formData.category || 'Not set'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black/20 uppercase">Sizes</span>
                  <span className="uppercase text-black">{selectedSizes.length > 0 ? selectedSizes.join(', ') : 'None selected'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-black/20 uppercase">Media</span>
                  <span className="uppercase text-black">{formData.media.length} Items</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setShowPreview(false)}
              className="w-full mt-8 h-14 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black/90 transition-all"
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
            {/* Unified Media Gallery Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Media Gallery ({formData.media.length}/15)</Label>
                  <p className="text-[10px] text-black/20 font-bold uppercase tracking-widest mt-1">Drag to reorder or use arrows</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    + Photo
                  </button>
                  <button 
                    type="button"
                    onClick={addVideoUrl}
                    className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                  >
                    <Video className="w-3.5 h-3.5" />
                    + Video
                  </button>
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

              <Reorder.Group 
                axis="y" 
                values={formData.media} 
                onReorder={(newMedia) => setFormData(prev => ({ ...prev, media: newMedia }))}
                className="space-y-3"
              >
                {formData.media.map((item, idx) => (
                  <Reorder.Item 
                    key={item.id} 
                    value={item}
                    className="bg-black/5 border-2 border-black/5 rounded-3xl p-3 flex items-center gap-4 group hover:border-black/10 transition-all"
                  >
                    <div className="w-16 h-20 rounded-2xl overflow-hidden bg-black/10 flex-shrink-0 relative">
                      {item.type === 'image' ? (
                        <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-black/20">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">
                        {idx + 1}
                      </div>
                    </div>

                    <div className="flex-grow min-w-0">
                      {item.type === 'image' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Image</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setCropImage(item.url);
                              setCropIndex(idx);
                              setIsGalleryCrop(false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-black/80 transition-all"
                          >
                            <CropIcon className="w-2.5 h-2.5" />
                            Crop
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Video URL</span>
                          <Input 
                            value={item.url}
                            onChange={(e) => updateVideoUrl(item.id, e.target.value)}
                            placeholder="Paste video or YouTube link..."
                            className="h-9 rounded-xl border-none bg-black/5 text-[11px] font-bold focus:ring-1 focus:ring-black/20"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-1">
                        <button 
                          type="button"
                          onClick={() => moveMedia(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-20"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => moveMedia(idx, 'down')}
                          disabled={idx === formData.media.length - 1}
                          className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-20"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeMedia(item.id)}
                        className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {formData.media.length === 0 && (
                <div className="py-12 border-2 border-dashed border-black/10 rounded-[32px] flex flex-col items-center justify-center gap-4 bg-black/[0.02]">
                  <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-black/20" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-black/40">No media added</p>
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mt-1">Add photos or videos to showcase your product</p>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-black/40">Product Name</Label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Namate Oversized Tee" 
                    className="pl-12 h-14 rounded-2xl border-2 border-black/10 bg-black/5 focus:border-black/30 transition-all font-bold text-black placeholder:text-black/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge" className="text-xs font-black uppercase tracking-widest text-black/40">Custom Badge (Optional)</Label>
                <div className="relative">
                  <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <Input 
                    id="badge" 
                    value={formData.badge}
                    onChange={handleInputChange}
                    placeholder="e.g. New Collection, Best Seller, Sold Out" 
                    className="pl-12 h-14 rounded-2xl border-2 border-black/5 focus:border-black/20 transition-all font-bold bg-black/5 text-black"
                  />
                </div>
                <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest px-2">This text will appear in the top-left corner of the product card.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-black uppercase tracking-widest text-black/40">Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                    <Input 
                      id="price" 
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="999" 
                      className="pl-12 h-14 rounded-2xl border-2 border-black/10 bg-black/5 focus:border-black/30 transition-all font-bold text-black placeholder:text-black/10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-black uppercase tracking-widest text-black/40">Category</Label>
                  <div className="space-y-3">
                    <Select onValueChange={handleCategoryChange} required={!isCustomCategory}>
                      <SelectTrigger className="h-14 rounded-2xl border-2 border-black/10 bg-black/5 focus:border-black/30 transition-all font-bold text-black">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-2 border-black/10 bg-white text-black">
                        {allCategories.map(cat => (
                          <SelectItem key={cat} value={cat} className="font-bold py-3 hover:bg-black/5">{cat}</SelectItem>
                        ))}
                        <div className="h-[1px] bg-black/10 my-1" />
                        <SelectItem value="CUSTOM_NEW" className="font-bold py-3 text-black hover:bg-black/5">
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
                            className="h-14 rounded-2xl border-2 border-black focus:border-black/70 transition-all font-bold text-black"
                            required
                          />
                          <button 
                            type="button"
                            onClick={() => setIsCustomCategory(false)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-red-500 hover:underline"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/5 border-2 border-black/10 rounded-[32px] p-6 flex items-center justify-between group hover:border-black/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-black">Premium</h4>
                      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Regal Page</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium }))}
                    className={cn(
                      "w-14 h-8 rounded-full relative transition-all duration-300",
                      formData.isPremium ? "bg-black" : "bg-black/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-lg",
                      formData.isPremium ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="bg-black/5 border-2 border-black/10 rounded-[32px] p-6 flex items-center justify-between group hover:border-black/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center">
                      <Play className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-black">Upcoming</h4>
                      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Coming Soon</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUpcoming: !prev.isUpcoming }))}
                    className={cn(
                      "w-14 h-8 rounded-full relative transition-all duration-300",
                      formData.isUpcoming ? "bg-black" : "bg-black/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-lg",
                      formData.isUpcoming ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/5 border-2 border-black/10 rounded-[32px] p-6 flex items-center justify-between group hover:border-black/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-black">Tribe Exclusive</h4>
                      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Members Only</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isTribeExclusive: !prev.isTribeExclusive }))}
                    className={cn(
                      "w-14 h-8 rounded-full relative transition-all duration-300",
                      formData.isTribeExclusive ? "bg-black" : "bg-black/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-lg",
                      formData.isTribeExclusive ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {formData.isTribeExclusive && (
                  <div className="space-y-2">
                    <Label htmlFor="tribeReleaseDate" className="text-xs font-black uppercase tracking-widest text-black/40">Tribe Release Date</Label>
                    <Input 
                      id="tribeReleaseDate" 
                      type="datetime-local"
                      value={formData.tribeReleaseDate}
                      onChange={handleInputChange}
                      className="h-14 rounded-2xl border-2 border-black/10 bg-black/5 focus:border-black/30 transition-all font-bold text-black"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory" className="text-xs font-black uppercase tracking-widest text-black/40">Subcategory (Optional)</Label>
                <div className="relative">
                  <Settings2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                  <Input 
                    id="subcategory" 
                    value={formData.subcategory}
                    onChange={handleInputChange}
                    placeholder="e.g. Oversized, Slim Fit, Cotton" 
                    className="pl-12 h-14 rounded-2xl border-2 border-black/5 focus:border-black/20 transition-all font-bold bg-black/5 text-black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-black/40">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell the tribe about this piece..." 
                  className="min-h-[120px] rounded-2xl border-2 border-black/5 focus:border-black/20 transition-all font-bold p-4 bg-black/5 text-black"
                  required
                />
              </div>
            </div>

            {/* Premium Collection Toggle */}
            <div className="p-6 bg-black/5 rounded-[32px] border-2 border-black/10 flex items-center justify-between group hover:border-black/30 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  formData.isPremium ? "bg-black text-white" : "bg-black/5 text-black/20"
                )}>
                  <Crown className={cn("w-6 h-6", formData.isPremium && "animate-pulse")} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-black">Promote to Regal</h3>
                  <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Mark as Premium Collection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isPremium: !prev.isPremium }))}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300",
                  formData.isPremium ? "bg-black" : "bg-black/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300",
                  formData.isPremium ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            {/* Gallery Section - Sub-collection */}
            <div className="space-y-6 pt-8 border-t border-black/5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Product Gallery (Sub-collection)</Label>
                  <p className="text-[10px] text-black/20 font-bold uppercase tracking-widest mt-1">Extra details for the tribe to explore</p>
                </div>
                <button 
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black/10 transition-all border border-black/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Gallery
                </button>
              </div>

              <input 
                type="file" 
                ref={galleryFileInputRef}
                onChange={(e) => handleFileSelect(e, true)}
                accept="image/*"
                multiple
                className="hidden"
              />

              {formData.galleryMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {formData.galleryMedia.map((item, idx) => (
                    <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden bg-black/5 border border-black/5 group">
                      <img src={item.url} alt="Gallery" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            setCropImage(item.url);
                            setCropIndex(idx);
                            setIsGalleryCrop(true);
                          }}
                          className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <CropIcon className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              galleryMedia: prev.galleryMedia.filter(m => m.id !== item.id)
                            }));
                          }}
                          className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-black/5 rounded-[32px] flex flex-col items-center justify-center text-black/20 hover:border-black/10 hover:bg-black/[0.02] cursor-pointer transition-all"
                >
                  <Plus className="w-6 h-6 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Gallery Images</span>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-black/40">Available Sizes</Label>
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
                className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-black/90 transition-all relative overflow-hidden group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {editingProductId ? 'UPDATING...' : 'PUBLISHING...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {editingProductId ? <Check className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    {editingProductId ? 'UPDATE PRODUCT' : 'PUBLISH PRODUCT'}
                  </div>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cropImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="p-4 flex items-center justify-between bg-black/50 backdrop-blur-md z-10">
              <button 
                onClick={() => {
                  setCropImage(null);
                  setCropIndex(null);
                  setCroppedAreaPixels(null);
                }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-center">
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Crop Image</h3>
                <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest mt-0.5">Adjust to fit 3:4 ratio</p>
              </div>
              <button 
                onClick={handleCropSave}
                disabled={isCropping || !croppedAreaPixels}
                className="px-6 py-2 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center gap-2"
              >
                {isCropping ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Crop'}
              </button>
            </div>

            <div className="flex-grow relative bg-neutral-900">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
              {!croppedAreaPixels && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                    <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">Loading Editor...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-black/50 backdrop-blur-md z-10">
              <div className="max-w-xs mx-auto space-y-4">
                <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BrandSignature variant="dark" className="mt-12 mb-20 opacity-20" />
    </div>
  );
}
