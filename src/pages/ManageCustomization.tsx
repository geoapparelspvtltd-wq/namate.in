import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Palette, 
  Sparkles, 
  Type, 
  Sliders, 
  Save, 
  RotateCcw,
  Heading,
  Layers,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DEFAULT_SITE_CONFIG } from '@/lib/AuthContext';

const PRESET_COLORS = [
  { name: 'Warm Charcoal', code: '#111111' },
  { name: 'Warm Off-White', code: '#F7F4F0' },
  { name: 'Studio Grey', code: '#EAE5DF' },
  { name: 'Pure White', code: '#FFFFFF' },
  { name: 'Namate Forest', code: '#1E2D24' },
  { name: 'Olive Green', code: '#3C4D3D' },
  { name: 'Tuscan Red', code: '#5F2D2D' },
  { name: 'Cosmic Indigo', code: '#2D3E50' },
  { name: 'Muted Gold', code: '#D4AF37' }
];

export default function ManageCustomization() {
  const navigate = useNavigate();
  const { user, role, siteConfig, updateSiteConfig, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'banner' | 'pages'>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Form states matching siteConfig
  const [formData, setFormData] = useState({
    brandName: '',
    primaryColor: '',
    homeBackgroundColor: '',
    secondaryBackgroundColor: '',
    announcementText: '',
    announcementBg: '',
    announcementTextColor: '',
    heroSubtitle: '',
    heroButtonText: '',
    heroImageUrl: '',
    shopTitle: '',
    shopSubtitle: '',
    regalTitle: '',
    regalSubtitle: '',
    tribeTitle: '',
    tribeSubtitle: '',
    showAnnouncement: true,
    announcementFont: 'sans',
    discountGalleryTitle: '',
    discountGallerySubtitle: '',
    aboutText: ''
  });

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  useEffect(() => {
    if (siteConfig) {
      setFormData({
        brandName: siteConfig.brandName || DEFAULT_SITE_CONFIG.brandName,
        primaryColor: siteConfig.primaryColor || DEFAULT_SITE_CONFIG.primaryColor,
        homeBackgroundColor: siteConfig.homeBackgroundColor || DEFAULT_SITE_CONFIG.homeBackgroundColor,
        secondaryBackgroundColor: siteConfig.secondaryBackgroundColor || DEFAULT_SITE_CONFIG.secondaryBackgroundColor,
        announcementText: siteConfig.announcementText || DEFAULT_SITE_CONFIG.announcementText,
        announcementBg: siteConfig.announcementBg || DEFAULT_SITE_CONFIG.announcementBg,
        announcementTextColor: siteConfig.announcementTextColor || DEFAULT_SITE_CONFIG.announcementTextColor,
        heroSubtitle: siteConfig.heroSubtitle || DEFAULT_SITE_CONFIG.heroSubtitle,
        heroButtonText: siteConfig.heroButtonText || DEFAULT_SITE_CONFIG.heroButtonText,
        heroImageUrl: siteConfig.heroImageUrl || DEFAULT_SITE_CONFIG.heroImageUrl,
        shopTitle: siteConfig.shopTitle || DEFAULT_SITE_CONFIG.shopTitle,
        shopSubtitle: siteConfig.shopSubtitle || DEFAULT_SITE_CONFIG.shopSubtitle,
        regalTitle: siteConfig.regalTitle || DEFAULT_SITE_CONFIG.regalTitle,
        regalSubtitle: siteConfig.regalSubtitle || DEFAULT_SITE_CONFIG.regalSubtitle,
        tribeTitle: siteConfig.tribeTitle || DEFAULT_SITE_CONFIG.tribeTitle,
        tribeSubtitle: siteConfig.tribeSubtitle || DEFAULT_SITE_CONFIG.tribeSubtitle,
        showAnnouncement: siteConfig.showAnnouncement !== undefined ? siteConfig.showAnnouncement : DEFAULT_SITE_CONFIG.showAnnouncement,
        announcementFont: siteConfig.announcementFont || DEFAULT_SITE_CONFIG.announcementFont,
        discountGalleryTitle: siteConfig.discountGalleryTitle || DEFAULT_SITE_CONFIG.discountGalleryTitle || 'Exclusive Deals',
        discountGallerySubtitle: siteConfig.discountGallerySubtitle || DEFAULT_SITE_CONFIG.discountGallerySubtitle || 'Limited Time Offers',
        aboutText: siteConfig.aboutText || DEFAULT_SITE_CONFIG.aboutText || ''
      });
    }
  }, [siteConfig]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4F0]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#F7F4F0]">
        <p className="text-sm font-black text-red-600 uppercase tracking-widest">Unauthorized Access</p>
        <Button onClick={() => navigate('/profile')} className="mt-4 bg-black text-white hover:bg-neutral-800 rounded-2xl">
          Return to Profile
        </Button>
      </div>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading("Saving site dynamic settings...");
    try {
      await updateSiteConfig(formData);
      toast.success("Site appearance controls successfully updated!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during save operations", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Restore entire aesthetic control back to standard Namate defaults?")) {
      setFormData({
        brandName: DEFAULT_SITE_CONFIG.brandName,
        primaryColor: DEFAULT_SITE_CONFIG.primaryColor,
        homeBackgroundColor: DEFAULT_SITE_CONFIG.homeBackgroundColor,
        secondaryBackgroundColor: DEFAULT_SITE_CONFIG.secondaryBackgroundColor,
        announcementText: DEFAULT_SITE_CONFIG.announcementText,
        announcementBg: DEFAULT_SITE_CONFIG.announcementBg,
        announcementTextColor: DEFAULT_SITE_CONFIG.announcementTextColor,
        heroSubtitle: DEFAULT_SITE_CONFIG.heroSubtitle,
        heroButtonText: DEFAULT_SITE_CONFIG.heroButtonText,
        heroImageUrl: DEFAULT_SITE_CONFIG.heroImageUrl,
        shopTitle: DEFAULT_SITE_CONFIG.shopTitle,
        shopSubtitle: DEFAULT_SITE_CONFIG.shopSubtitle,
        regalTitle: DEFAULT_SITE_CONFIG.regalTitle,
        regalSubtitle: DEFAULT_SITE_CONFIG.regalSubtitle,
        tribeTitle: DEFAULT_SITE_CONFIG.tribeTitle,
        tribeSubtitle: DEFAULT_SITE_CONFIG.tribeSubtitle,
        showAnnouncement: DEFAULT_SITE_CONFIG.showAnnouncement,
        announcementFont: DEFAULT_SITE_CONFIG.announcementFont,
        discountGalleryTitle: DEFAULT_SITE_CONFIG.discountGalleryTitle || 'Exclusive Deals',
        discountGallerySubtitle: DEFAULT_SITE_CONFIG.discountGallerySubtitle || 'Limited Time Offers',
        aboutText: DEFAULT_SITE_CONFIG.aboutText || ''
      });
      toast.success("Loaded Namate brand defaults. Save to apply.");
    }
  };

  return (
    <div className="bg-[#F7F4F0] min-h-screen pb-40 pt-24 relative px-4 text-black font-sans">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 bg-white/50 border border-black/5 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 text-black" />
          </button>
          <div className="text-left">
            <h1 className="text-xl font-black uppercase tracking-tight">Site Aesthetics</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-black/40">Change colors, banners & settings dynamically</p>
          </div>
        </div>

        {/* Quick Navigation / Tabs */}
        <div className="flex bg-black/5 p-1 rounded-[22px] mb-8 no-scrollbar overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex-1 py-2.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap px-4",
              activeTab === 'general' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={cn(
              "flex-1 py-2.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap px-4",
              activeTab === 'theme' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            Colors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className={cn(
              "flex-1 py-2.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap px-4",
              activeTab === 'banner' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            Banners
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={cn(
              "flex-1 py-2.5 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap px-4",
              activeTab === 'pages' ? "bg-white text-black shadow-sm" : "text-black/40"
            )}
          >
            Pages Text
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* TAB 1: GENERAL BRANDING */}
          {activeTab === 'general' && (
            <div className="space-y-5 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-4 h-4 text-black/50" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">Branding Setup</h3>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Store Brand Title</label>
                <Input 
                  value={formData.brandName} 
                  onChange={(e) => handleFieldChange('brandName', e.target.value.toUpperCase())}
                  placeholder="e.g. NAMATE"
                  className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold font-sans uppercase tracking-widest"
                />
              </div>

              {/* Announcement Bar Settings */}
              <div className="h-[1px] bg-black/5 my-4" />
              
              <div className="flex items-center justify-between p-3 bg-black/5 rounded-2xl">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-tight text-black">Show Announcement Bar</h4>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-black/30">Activate strip display on page tops</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFieldChange('showAnnouncement', !formData.showAnnouncement)}
                  className={cn(
                    "relative w-12 h-6 rounded-full p-0.5 transition-colors duration-200",
                    formData.showAnnouncement ? "bg-black" : "bg-neutral-200"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200",
                    formData.showAnnouncement ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Announcement Message Text</label>
                <Input 
                  value={formData.announcementText} 
                  disabled={!formData.showAnnouncement}
                  onChange={(e) => handleFieldChange('announcementText', e.target.value)}
                  placeholder="e.g. FREE SHIPPING ON ALL ORDERS!"
                  className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Announcement Font</label>
                <select
                  value={formData.announcementFont}
                  disabled={!formData.showAnnouncement}
                  onChange={(e) => handleFieldChange('announcementFont', e.target.value)}
                  className="w-full h-12 bg-black/5 border border-black/10 rounded-xl px-4 text-xs font-bold outline-none"
                >
                  <option value="sans">Clean Neo-Sans (Inter)</option>
                  <option value="serif">Elegant Editorial (Serif)</option>
                  <option value="mono">Tech Monospace (JetBrains)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR CUSTOMIZATION */}
          {activeTab === 'theme' && (
            <div className="space-y-5 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Palette className="w-4 h-4 text-black/50" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">Aesthetic Colorways</h3>
              </div>

              {/* Announcement Bar Background */}
              <div className="space-y-2 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2 text-left block">Announcement Strip Background</label>
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-xl border border-black/10 shadow-inner flex-shrink-0" style={{ backgroundColor: formData.announcementBg }} />
                  <Input 
                    value={formData.announcementBg} 
                    onChange={(e) => handleFieldChange('announcementBg', e.target.value)}
                    placeholder="#000000"
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-9 gap-1.5 mt-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleFieldChange('announcementBg', c.code)}
                      className="w-7 h-7 rounded-lg border border-black/5 transition-transform active:scale-90"
                      style={{ backgroundColor: c.code }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Announcement Text Color */}
              <div className="space-y-2 text-left mt-4">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2 text-left block">Announcement Strip Text Color</label>
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-xl border border-black/10 shadow-inner flex-shrink-0" style={{ backgroundColor: formData.announcementTextColor }} />
                  <Input 
                    value={formData.announcementTextColor} 
                    onChange={(e) => handleFieldChange('announcementTextColor', e.target.value)}
                    placeholder="#FFFFFF"
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Home primary background */}
              <div className="h-[1px] bg-black/5 my-4" />
              
              <div className="space-y-2 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2 text-left block">Home Page Primary Canvas Background</label>
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-xl border border-black/10 shadow-inner flex-shrink-0" style={{ backgroundColor: formData.homeBackgroundColor }} />
                  <Input 
                    value={formData.homeBackgroundColor} 
                    onChange={(e) => handleFieldChange('homeBackgroundColor', e.target.value)}
                    placeholder="#F7F4F0"
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-9 gap-1.5 mt-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleFieldChange('homeBackgroundColor', c.code)}
                      className="w-7 h-7 rounded-lg border border-black/5 transition-transform active:scale-90"
                      style={{ backgroundColor: c.code }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Secondary Layout Background */}
              <div className="space-y-2 text-left mt-4">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2 text-left block">Sub-Page Secondary Canvas Background</label>
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-xl border border-black/10 shadow-inner flex-shrink-0" style={{ backgroundColor: formData.secondaryBackgroundColor }} />
                  <Input 
                    value={formData.secondaryBackgroundColor} 
                    onChange={(e) => handleFieldChange('secondaryBackgroundColor', e.target.value)}
                    placeholder="#FAF8F5"
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHOWCASE HERO BANNERS */}
          {activeTab === 'banner' && (
            <div className="space-y-5 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-4 h-4 text-black/50" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">Hero Slides Aesthetic</h3>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Hero Cover Subtitle</label>
                <Input 
                  value={formData.heroSubtitle} 
                  onChange={(e) => handleFieldChange('heroSubtitle', e.target.value)}
                  placeholder="e.g. Timeless pieces. Naturally made."
                  className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Hero Cover Action Button Label</label>
                <Input 
                  value={formData.heroButtonText} 
                  onChange={(e) => handleFieldChange('heroButtonText', e.target.value.toUpperCase())}
                  placeholder="e.g. SHOP COLLECTION"
                  className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold uppercase tracking-widest"
                />
              </div>

              <div className="space-y-1.5 text-left mt-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Static Banner Cover Image Override (Optional)</label>
                <Input 
                  value={formData.heroImageUrl} 
                  onChange={(e) => handleFieldChange('heroImageUrl', e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/... (leave empty for dynamic Lookbook slides)"
                  className="rounded-xl border-black/10 bg-black/5 h-12 text-xs"
                />
                <p className="text-[8px] font-bold text-black/30 mt-1 uppercase tracking-wide">Enter an image URL to override slider with a gorgeous static visual</p>
              </div>
            </div>
          )}

          {/* TAB 4: EVERY OTHER PAGE SUBTITLES & TEXTS */}
          {activeTab === 'pages' && (
            <div className="space-y-5 bg-white p-6 rounded-[28px] border border-black/5 shadow-sm max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center gap-3 mb-2">
                <Type className="w-4 h-4 text-black/50" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">Page Subtitles & Titles</h3>
              </div>

              {/* Shop Page */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-black/60 border-b pb-1">Shop Catalog</h4>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Shop Screen Display Title</label>
                  <Input 
                    value={formData.shopTitle} 
                    onChange={(e) => handleFieldChange('shopTitle', e.target.value.toUpperCase())}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-black uppercase tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Shop Screen Subtitle Description</label>
                  <Input 
                    value={formData.shopSubtitle} 
                    onChange={(e) => handleFieldChange('shopSubtitle', e.target.value)}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Regal Page */}
              <div className="space-y-4 mt-6">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-black/60 border-b pb-1">Namate Regal Page</h4>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Regal Custom Screen Title</label>
                  <Input 
                    value={formData.regalTitle} 
                    onChange={(e) => handleFieldChange('regalTitle', e.target.value.toUpperCase())}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-black uppercase tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Regal Sub-Header Pitch</label>
                  <Input 
                    value={formData.regalSubtitle} 
                    onChange={(e) => handleFieldChange('regalSubtitle', e.target.value)}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Tribe Page */}
              <div className="space-y-4 mt-6">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-black/60 border-b pb-1">The Tribe Page</h4>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Tribe Journal Main Label</label>
                  <Input 
                    value={formData.tribeTitle} 
                    onChange={(e) => handleFieldChange('tribeTitle', e.target.value.toUpperCase())}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-black uppercase tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Tribe Pitch/Subtitle</label>
                  <Input 
                    value={formData.tribeSubtitle} 
                    onChange={(e) => handleFieldChange('tribeSubtitle', e.target.value)}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Discount Gallery Section */}
              <div className="space-y-4 mt-6">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-black/60 border-b pb-1">Home Discount Gallery</h4>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Deals Section Title</label>
                  <Input 
                    value={formData.discountGalleryTitle} 
                    onChange={(e) => handleFieldChange('discountGalleryTitle', e.target.value)}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Deals Section Subtitle</label>
                  <Input 
                    value={formData.discountGallerySubtitle} 
                    onChange={(e) => handleFieldChange('discountGallerySubtitle', e.target.value)}
                    className="rounded-xl border-black/10 bg-black/5 h-12 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Home About Brand Scroll Section */}
              <div className="space-y-4 mt-6">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-black/60 border-b pb-1">Brand About Scroll Feature</h4>
                <div className="space-y-1.5 text-left">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-2">Text Content (Scroll Activated highlight effect)</label>
                  <textarea 
                    value={formData.aboutText} 
                    onChange={(e) => handleFieldChange('aboutText', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-black/10 bg-black/5 p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/5 text-black resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleRestoreDefaults}
              className="flex-1 h-14 bg-white hover:bg-black/5 text-black border-2 border-black/5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Defaults
            </Button>

            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-14 bg-black hover:bg-neutral-950 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Layout
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
