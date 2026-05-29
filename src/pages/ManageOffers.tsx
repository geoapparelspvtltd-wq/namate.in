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
  Check,
  Type,
  LayoutGrid,
  Tags,
  Percent,
  SlidersHorizontal,
  Search,
  Settings,
  Sparkles,
  ShoppingBag,
  Info
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
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  setDoc,
  updateDoc,
  where,
  limit
} from 'firebase/firestore';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import BrandSignature from '@/components/BrandSignature';

interface OfferCampaign {
  id: string;
  title: string;
  discountPercent: number;
  description: string;
  createdAt?: any;
}

interface SecondGalleryConfig {
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  linkType: 'shop' | 'offer';
  offerId?: string;
  updatedAt?: any;
}

export default function ManageOffers() {
  const navigate = useNavigate();
  const { user, role, loading, isNative, requestImagePick } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  const [activeTab, setActiveTab] = useState<'banner' | 'offers'>('banner');
  const [offers, setOffers] = useState<OfferCampaign[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<OfferCampaign | null>(null);

  // Loading States
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New Offer Form State
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDiscount, setOfferDiscount] = useState<number>(10);
  const [offerDesc, setOfferDesc] = useState('');

  // Second Gallery Config Form State
  const [bannerConfig, setBannerConfig] = useState<SecondGalleryConfig>({
    imageUrl: 'https://images.unsplash.com/photo-1576016770956-debb63d900bb?auto=format&fit=crop&w=800&q=85',
    title: 'CRAFTED FOR YOU',
    subtitle: 'Timeless pieces. Naturally made.',
    buttonText: 'SHOP COLLECTION',
    linkType: 'shop',
    offerId: ''
  });

  // Search filter for mapping products
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique categories list
  const uniqueCategories = React.useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).filter(Boolean).sort();
  }, [products]);

  // Fetch offers, products, and second gallery configs
  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/profile');
      return;
    }

    // 1. Listen to Offers
    const offersUnsub = onSnapshot(query(collection(db, 'offers'), orderBy('createdAt', 'desc')), (snapshot) => {
      const dbOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OfferCampaign[];
      setOffers(dbOffers);
      setIsPageLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Failed to load offer campaigns");
    });

    // 2. Listen to Products (safely query-limited and filtered by category to handle 100,000+ products instantly)
    const productConstraints = [];
    if (categoryFilter && categoryFilter !== 'ALL') {
      productConstraints.push(where('category', '==', categoryFilter));
    }
    productConstraints.push(limit(150));
    const productsUnsub = onSnapshot(query(collection(db, 'products'), ...productConstraints), (snapshot) => {
      const dbProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(dbProducts);
    });

    // 3. Fetch Second Gallery Config document if exists
    const bannerUnsub = onSnapshot(doc(db, 'configs', 'second_gallery'), (docSnap) => {
      if (docSnap.exists()) {
        setBannerConfig(docSnap.data() as SecondGalleryConfig);
      }
    });

    return () => {
      offersUnsub();
      productsUnsub();
      bannerUnsub();
    };
  }, [isAdmin, loading, categoryFilter]);

  // Handle Native image success for iOS/Android
  useEffect(() => {
    if (!isNative) return;

    const handleNativeImage = async (event: any) => {
      const { data } = event.detail;
      const base64 = data?.image || data?.base64 || data?.data;
      
      if (!base64) return;

      setIsUploading(true);
      const toastId = toast.loading("Compressing uploaded photograph...");

      try {
        const formattedBase64 = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
        const compressed = await compressImage(formattedBase64, 1200, 800, 0.6);
        
        setBannerConfig(prev => ({
          ...prev,
          imageUrl: compressed
        }));

        toast.success("Image uploaded successfully!", { id: toastId });
      } catch (error) {
        console.error("Native Gallery Error:", error);
        toast.error("Failed to process image", { id: toastId });
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener('flutterImageSuccess' as any, handleNativeImage);
    return () => window.removeEventListener('flutterImageSuccess' as any, handleNativeImage);
  }, [isNative]);

  // Upload custom second gallery banner image
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading("Processing and compressing photo...");

    try {
      const file = files[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 1200, 800, 0.6);
      
      setBannerConfig(prev => ({
        ...prev,
        imageUrl: compressed
      }));

      toast.success("Banner photo added!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to process banner image");
    } finally {
      setIsUploading(false);
    }
  };

  // Save Second Gallery Banner configuration
  const handleSaveBanner = async () => {
    setIsActionLoading(true);
    const toastId = toast.loading("Saving lookbook spotlight banner...");

    try {
      await setDoc(doc(db, 'configs', 'second_gallery'), {
        ...bannerConfig,
        updatedAt: serverTimestamp()
      });
      toast.success("Spotlight banner successfully synchronized!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to configure spotlight banner", { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Create active offer campaign
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsActionLoading(true);
    const id = offerTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const toastId = toast.loading("Provisioning promotional collection...");

    try {
      await setDoc(doc(db, 'offers', id), {
        title: offerTitle.trim(),
        discountPercent: Number(offerDiscount),
        description: offerDesc.trim(),
        createdAt: serverTimestamp()
      });

      toast.success(`Active offer "${offerTitle}" is operational!`, { id: toastId });
      setOfferTitle('');
      setOfferDesc('');
      setOfferDiscount(10);
    } catch (error) {
      console.error(error);
      toast.error("Failed to compile promotional campaign", { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Offer Campaign and reset associated products
  const handleDeleteOffer = async (id: string, name: string) => {
    if (!window.confirm(`Disband campaign "${name}"? This will detach all associated products.`)) return;

    setIsActionLoading(true);
    const toastId = toast.loading(`Disbanding campaign and restored prices...`);

    try {
      // Find matches in products and restore prices
      const linkedProducts = products.filter(p => p.offerId === id);
      const updatePromises = linkedProducts.map(product => {
        const resetPrice = product.originalPrice || product.price;
        return updateDoc(doc(db, 'products', product.id), {
          price: resetPrice,
          discount: 0,
          offerId: '',
          originalPrice: null,
          badge: product.badge === name ? '' : (product.badge || '')
        });
      });

      await Promise.all(updatePromises);
      await deleteDoc(doc(db, 'offers', id));

      toast.success("Promotion successfully deactivated and prices restored!", { id: toastId });
      if (selectedOffer?.id === id) {
        setSelectedOffer(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to terminate promotional campaign", { id: toastId });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Add/Remove products to active discount offer
  const handleToggleProductInOffer = async (product: any, isInOffer: boolean) => {
    if (!selectedOffer) return;

    try {
      if (isInOffer) {
        // Toggle on: recalculate selling price with active discount
        const original = product.originalPrice || product.price;
        const selling = Math.round(original * (1 - selectedOffer.discountPercent / 100));

        await updateDoc(doc(db, 'products', product.id), {
          offerId: selectedOffer.id,
          discount: selectedOffer.discountPercent,
          originalPrice: original,
          price: selling,
          badge: `${selectedOffer.discountPercent}% OFF`
        });
        toast.success(`Added ${product.name} at ₹${selling}`);
      } else {
        // Toggle off: restore base original price
        const resetPrice = product.originalPrice || product.price;
        await updateDoc(doc(db, 'products', product.id), {
          offerId: '',
          discount: 0,
          price: resetPrice,
          originalPrice: null,
          badge: ''
        });
        toast.info(`Restored ${product.name} to ₹${resetPrice}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Pricing modification error");
    }
  };

  // Filter products mapped to selected campaign
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  if (loading || isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-4xl mx-auto px-4 pt-12">
        
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Promos & Spotlight</h1>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Manage secondary gallery and dynamic offers</p>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex border-b border-black/10 mb-8">
          <button
            onClick={() => setActiveTab('banner')}
            className={cn(
              "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all text-center border-b-2",
              activeTab === 'banner' ? "border-black text-black" : "border-transparent text-black/40 hover:text-black/60"
            )}
          >
            Spotlight Banner Configuration
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={cn(
              "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all text-center border-b-2",
              activeTab === 'offers' ? "border-black text-black" : "border-transparent text-black/40 hover:text-black/60"
            )}
          >
            Campaign Discount Offers
          </button>
        </div>

        {activeTab === 'banner' ? (
          /* SPOTLIGHT BANNER CONFIGURATION */
          <div className="space-y-8 animate-fade-in">
            <section className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-neutral-800 mb-6">Spotlight Preview</h2>
              
              {/* Home spotlight Card reproduction */}
              <div className="relative rounded-2xl overflow-hidden h-36 border border-neutral-200 shadow-sm mb-4">
                <div className="absolute inset-0">
                  <img 
                    src={bannerConfig.imageUrl} 
                    alt="Spotlight texture" 
                    className="w-full h-full object-cover brightness-[0.9] saturate-[0.8]"
                  />
                  <div className="absolute inset-0 bg-black/15" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 space-y-1 z-10">
                  <span className="text-[8px] font-black tracking-[0.3em] text-white/70 uppercase">
                    {bannerConfig.title || 'CRAFTED FOR YOU'}
                  </span>
                  <p className="font-serif italic text-xs text-white/95">
                    {bannerConfig.subtitle || 'Timeless pieces. Naturally made.'}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block bg-white hover:bg-neutral-100 text-[#111] text-[7.5px] font-black uppercase tracking-widest px-6 py-2 rounded-sm cursor-pointer shadow-md">
                      {bannerConfig.buttonText || 'SHOP COLLECTION'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider text-center">This card will adjust live in the homepage second gallery stream</p>
            </section>

            <section className="bg-[#FAF8F5] rounded-3xl p-8 border border-neutral-200/50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Image upload area */}
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Spotlight Banner Image</Label>
                  
                  <div 
                    onClick={() => {
                      if (isNative) {
                        requestImagePick('gallery');
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="h-36 bg-neutral-200/20 border-2 border-dashed border-neutral-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-black/30 transition-all overflow-hidden relative group"
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-black/40" />
                    ) : (
                      <>
                        <img 
                          src={bannerConfig.imageUrl} 
                          alt="Banner upload preview" 
                          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/5 hover:bg-black/20 text-white transition-colors duration-200">
                          <Camera className="w-6 h-6 text-white mb-1 shadow-sm" />
                          <span className="text-[9px] font-black tracking-widest uppercase">Change Banner Image</span>
                        </div>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Text entries */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40">Banner Label Title</Label>
                    <Input 
                      value={bannerConfig.title}
                      onChange={(e) => setBannerConfig(prev => ({ ...prev, title: e.target.value.toUpperCase() }))}
                      placeholder="e.g. CRAFTED FOR YOU"
                      className="mt-1 h-12 rounded-xl focus:ring-black bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40">Banner Subtitle Or Promo Message</Label>
                    <Input 
                      value={bannerConfig.subtitle}
                      onChange={(e) => setBannerConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="e.g. Timeless pieces. Naturally made."
                      className="mt-1 h-12 rounded-xl focus:ring-black bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Button Call-to-text</Label>
                  <Input 
                    value={bannerConfig.buttonText}
                    onChange={(e) => setBannerConfig(prev => ({ ...prev, buttonText: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SHOP COLLECTION"
                    className="mt-1 h-12 rounded-xl focus:ring-black bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Banner Linking Path</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setBannerConfig(prev => ({ ...prev, linkType: 'shop', offerId: '' }))}
                      className={cn(
                        "h-12 border-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        bannerConfig.linkType === 'shop' 
                          ? "border-black bg-black text-white" 
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-black"
                      )}
                    >
                      All Shop Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerConfig(prev => ({ ...prev, linkType: 'offer' }))}
                      className={cn(
                        "h-12 border-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        bannerConfig.linkType === 'offer' 
                          ? "border-black bg-black text-white" 
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-black"
                      )}
                    >
                      Active Discount Offers
                    </button>
                  </div>
                </div>
              </div>

              {bannerConfig.linkType === 'offer' && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Choose Targeted Offer Campaign</Label>
                  {offers.length > 0 ? (
                    <Select 
                      onValueChange={(val) => setBannerConfig(prev => ({ ...prev, offerId: val }))} 
                      value={bannerConfig.offerId || ''}
                    >
                      <SelectTrigger className="h-12 rounded-xl border border-neutral-200 bg-white text-black font-bold">
                        <SelectValue placeholder="Select Active Campaign..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-white text-black bg-neutral-50 py-1">
                        {offers.map(offer => (
                          <SelectItem key={offer.id} value={offer.id} className="font-bold py-3">
                            {offer.title} ({offer.discountPercent}% Off)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl flex items-center gap-3 border border-yellow-200 text-xs">
                      <Info className="w-5 h-5" />
                      <span>No active discount campaigns found. Create one under the "Campaign Discount Offers" tab first!</span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleSaveBanner}
                disabled={isActionLoading || isUploading}
                className="w-full h-16 bg-black text-white hover:bg-neutral-800 uppercase tracking-widest text-xs font-black rounded-2xl flex items-center justify-center gap-2"
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>SYNCHRONIZE SPOTLIGHT BANNER</span>
                  </>
                )}
              </Button>
            </section>
          </div>
        ) : (
          /* MANAGING CAMPAIGN DISCOUNT OFFERS & PRODUCT MAPPING */
          <div className="space-y-10 animate-fade-in">
            
            {/* Form to provision new Discount Offer */}
            <section className="bg-neutral-50 rounded-3xl p-8 border border-neutral-200/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-black mb-6">Create New Promotion / Offer Link</h2>
              
              <form onSubmit={handleCreateOffer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40">Campaign Title / Banner Tag</Label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/25" />
                      <Input 
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        placeholder="e.g. 10% OFF, FLAT 20% DROP"
                        className="pl-12 h-14 rounded-2xl border bg-white font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-black/40">Discount Amount (%)</Label>
                    <Input 
                      type="number"
                      min="1"
                      max="100"
                      value={offerDiscount}
                      onChange={(e) => setOfferDiscount(Number(e.target.value))}
                      className="h-14 rounded-2xl border bg-white font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40">Campaign Description (Optional)</Label>
                  <Input 
                    value={offerDesc}
                    onChange={(e) => setOfferDesc(e.target.value)}
                    placeholder="e.g. Unlocked season deals of selected minimal style essentials"
                    className="h-14 rounded-2xl border bg-white font-bold"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full h-14 bg-black text-white hover:bg-neutral-800 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                >
                  {isActionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : 'PROVISION CAMPAIGN COLLECTION'}
                </Button>
              </form>
            </section>

            {/* List and assign area */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Campaign Collection Select Column */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black/40">Active Campaigns (Click to select)</h3>
                
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {offers.map(offer => (
                    <div 
                      key={offer.id}
                      onClick={() => setSelectedOffer(selectedOffer?.id === offer.id ? null : offer)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden",
                        selectedOffer?.id === offer.id 
                          ? "border-black bg-neutral-900 text-white" 
                          : "border-neutral-200 bg-white text-black hover:border-black/50"
                      )}
                    >
                      <div className="flex items-start justify-between z-10">
                        <div>
                          <h4 className="font-brand font-bold text-base">{offer.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest py-0.5 text-[#C5A059]">
                            {offer.discountPercent}% OFF ACTIVE
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOffer(offer.id, offer.title);
                          }}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                            selectedOffer?.id === offer.id 
                              ? "bg-white/10 hover:bg-red-500/80 hover:text-white" 
                              : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {offer.description && (
                        <p className={cn(
                          "text-xs mt-3 line-clamp-2",
                          selectedOffer?.id === offer.id ? "text-white/60" : "text-neutral-500"
                        )}>
                          {offer.description}
                        </p>
                      )}

                      <div className="absolute right-[-15px] bottom-[-20px] text-8xl font-black text-black/5 pointer-events-none">
                        {offer.discountPercent}
                      </div>
                    </div>
                  ))}

                  {offers.length === 0 && (
                    <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                      <Percent className="w-8 h-8 text-neutral-300 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No active discount campaigns</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Products listing and association Column */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black/40">
                    {selectedOffer ? `Add products to "${selectedOffer.title}"` : 'Select a campaign to link products'}
                  </h3>
                  {selectedOffer && (
                    <span className="text-[9px] font-bold text-neutral-500 uppercase">
                      {products.filter(p => p.offerId === selectedOffer.id).length} linked items
                    </span>
                  )}
                </div>

                {selectedOffer ? (
                  <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-4">
                    {/* Filter / Search bars */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                        <Input 
                          placeholder="Search product inventory..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[150px] bg-white text-black font-bold text-xs h-10">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
                          <SelectItem value="ALL" className="font-bold py-2">ALL CATEGORIES</SelectItem>
                          {uniqueCategories.map(cat => (
                            <SelectItem key={cat} value={cat} className="font-bold py-2">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Products Grid selector */}
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-2">
                      {filteredProducts.map((p) => {
                        const isThisOffer = p.offerId === selectedOffer.id;
                        const otherOffer = p.offerId && p.offerId !== selectedOffer.id;
                        return (
                          <div 
                            key={p.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border transition-all bg-white",
                              isThisOffer 
                                ? "border-green-300 bg-green-50/10 shadow-sm" 
                                : otherOffer 
                                  ? "opacity-60 border-yellow-200"
                                  : "border-neutral-200 hover:border-black/30"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <img src={p.image} className="w-12 h-14 object-cover rounded bg-neutral-100 border border-neutral-200" alt="" />
                              <div className="text-left">
                                <h4 className="font-bold text-xs line-clamp-1 text-neutral-800 uppercase">{p.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-bold text-xs text-neutral-900">₹{p.price}</span>
                                  {p.originalPrice && (
                                    <span className="text-[10px] text-neutral-400 line-through">₹{p.originalPrice}</span>
                                  )}
                                  <span className="text-[9px] font-black tracking-wider uppercase text-neutral-400">({p.category})</span>
                                </div>
                                {isThisOffer && (
                                  <span className="text-[8px] font-black text-green-600 tracking-wider uppercase">Linked! Discount Applied</span>
                                )}
                                {otherOffer && (
                                  <span className="text-[8px] font-black text-yellow-600 tracking-wider uppercase">Linked to: {p.badge || p.offerId}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleProductInOffer(p, !isThisOffer)}
                              className={cn(
                                "h-8 px-4 font-black uppercase text-[8px] tracking-widest rounded-lg border-2 transition-all active:scale-95",
                                isThisOffer 
                                  ? "border-green-500 bg-green-500 text-white" 
                                  : otherOffer
                                    ? "border-yellow-200 text-yellow-600 bg-yellow-50 hover:border-yellow-500"
                                    : "border-black bg-white text-black hover:bg-neutral-900 hover:text-white"
                              )}
                            >
                              {isThisOffer ? 'INCLUDED' : otherOffer ? 'RE-LINK' : 'ADD'}
                            </button>
                          </div>
                        );
                      })}

                      {filteredProducts.length === 0 && (
                        <div className="text-center py-10">
                          <ShoppingBag className="w-6 h-6 text-neutral-400 mx-auto mb-1 animate-bounce" />
                          <p className="text-xs font-bold text-neutral-400 uppercase">No products matching filters</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200">
                    <Sparkles className="w-10 h-10 text-[#C5A059] mx-auto mb-3 animate-pulse" />
                    <h3 className="text-xs font-black uppercase text-neutral-600 tracking-widest mb-1">No Active Selection</h3>
                    <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider max-w-xs mx-auto">
                      Review list of active campaigns to the left and click to begin adding and discounting items dynamically in real-time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BrandSignature variant="dark" className="opacity-20 mt-16" />
    </div>
  );
}
