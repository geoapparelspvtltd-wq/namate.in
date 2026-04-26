import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  Layout,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Save,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, query, setDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/utils';

interface CategoryConfig {
  id: string;
  name: string;
  imageUrl?: string;
  showOnHome: boolean;
  order: number;
  createdAt?: any;
}

export default function ManageCategories() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'main' | 'sub'>('sub');
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategoryId, setUploadCategoryId] = useState<string | null>(null);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;

    setIsLoading(true);
    // 1. Fetch unique categories/subcategories from products
    const fetchCategoryData = async () => {
      try {
        const productSnap = await getDocs(collection(db, 'products'));
        const fieldName = activeTab === 'main' ? 'category' : 'subcategory';
        const uniqueNames = Array.from(new Set(productSnap.docs.map(d => d.data()[fieldName]).filter(Boolean)));
        
        // 2. Fetch existing configs
        const configCollection = activeTab === 'main' ? 'category_configs' : 'subcategory_configs';
        const configUnsubscribe = onSnapshot(collection(db, configCollection), (snapshot) => {
          const configs = snapshot.docs.reduce((acc, d) => {
            acc[d.id] = { id: d.id, ...d.data() };
            return acc;
          }, {} as Record<string, any>);

          // Merge: use config if exists, otherwise default
          const merged = uniqueNames.map(name => {
            const config = configs[name as string];
            return {
              id: name as string,
              name: name as string,
              imageUrl: config?.imageUrl || '',
              showOnHome: config?.showOnHome ?? true, // Default to true for subcategories
              order: config?.order ?? 999
            };
          });

          // Sort by order then name
          merged.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
          setCategories(merged);
          setIsLoading(false);
        });

        return () => configUnsubscribe();
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load category data");
        setIsLoading(false);
      }
    };

    fetchCategoryData();
  }, [isAdmin, activeTab]);

  const handleUpdateConfig = async (categoryId: string, updates: Partial<CategoryConfig>) => {
    setIsSaving(categoryId);
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const fullConfig = {
        ...category,
        ...updates,
        updatedAt: serverTimestamp()
      };

      const configCollection = activeTab === 'main' ? 'category_configs' : 'subcategory_configs';
      await setDoc(doc(db, configCollection, categoryId), {
        name: fullConfig.name,
        imageUrl: fullConfig.imageUrl || '',
        showOnHome: fullConfig.showOnHome,
        order: fullConfig.order,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success(`Updated ${categoryId}`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update config");
    } finally {
      setIsSaving(null);
    }
  };

  const handleImageUpload = (categoryId: string) => {
    setUploadCategoryId(categoryId);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadCategoryId) return;

    setIsUploading(uploadCategoryId);
    const toastId = toast.loading(`Uploading cover for ${uploadCategoryId}...`);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const rawBase64 = await base64Promise;
      const compressedBase64 = await compressImage(rawBase64, 800, 800, 0.7);

      await handleUpdateConfig(uploadCategoryId, { imageUrl: compressedBase64 });
      toast.success("Image updated!", { id: toastId });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image", { id: toastId });
    } finally {
      setIsUploading(null);
      setUploadCategoryId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    // Swap
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    // Update orders locally then save to DB
    newCategories.forEach((cat, idx) => {
      cat.order = idx;
      handleUpdateConfig(cat.id, { order: idx });
    });
  };

  if (loading || (isAdmin && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center">Access Denied</h1>
        <Button onClick={() => navigate('/')}>BACK TO HOME</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter text-black">Home Management</h1>
        </div>
      </div>

      <div className="px-4 py-8">
        {/* Tabs */}
        <div className="flex bg-black/5 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => setActiveTab('sub')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'sub' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            Subcategory Strips
          </button>
          <button 
            onClick={() => setActiveTab('main')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
              activeTab === 'main' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            Main Category Icons
          </button>
        </div>

        <div className="flex items-center gap-2 mb-8 px-2">
          <Layout className="w-5 h-5 text-black" />
          <h2 className="text-xs font-black uppercase tracking-widest text-black/40">
            {activeTab === 'sub' 
              ? "Configure strips and order for Home Page subcategories"
              : "Set icons for the home page category boxes"}
          </h2>
        </div>

        <div className="space-y-4">
          {categories.map((cat, index) => (
            <div 
              key={cat.id}
              className={cn(
                "bg-black/5 rounded-[32px] border-2 border-black/5 p-6 transition-all group",
                cat.showOnHome ? "border-black/10 bg-white shadow-xl shadow-black/5" : "opacity-60"
              )}
            >
              <div className="flex items-center gap-6">
                {/* Order Controls */}
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => moveCategory(index, 'up')}
                    disabled={index === 0}
                    className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center disabled:opacity-20 hover:bg-black hover:text-white transition-all"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveCategory(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center disabled:opacity-20 hover:bg-black hover:text-white transition-all"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-black">{cat.name}</h3>
                    {cat.showOnHome && (
                      <div className="bg-[#3EBBA4]/10 text-[#3EBBA4] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        LIVE ON HOME
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                    {activeTab === 'sub' ? 'Strip Position' : 'Icon Position'}: {index + 1}
                  </p>
                </div>

                {/* Toggle & Upload */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleUpdateConfig(cat.id, { showOnHome: !cat.showOnHome })}
                    disabled={isSaving === cat.id}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      cat.showOnHome ? "bg-black text-white" : "bg-black/5 text-black/20"
                    )}
                  >
                    {isSaving === cat.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : cat.showOnHome ? (
                      <Eye className="w-6 h-6" />
                    ) : (
                      <EyeOff className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>

              {/* Image Preview / Upload */}
              <div className="mt-6 flex items-center gap-4">
                <div 
                  className="w-full h-40 rounded-2xl bg-black/5 border-2 border-dashed border-black/10 overflow-hidden relative cursor-pointer group/img hover:border-black/20 transition-all"
                  onClick={() => handleImageUpload(cat.id)}
                >
                  {cat.imageUrl ? (
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-20">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        No {activeTab === 'main' ? 'Icon' : 'Cover'} Image
                      </span>
                    </div>
                  )}

                  {isUploading === cat.id && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  ) || (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Update Image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
