import { Link } from 'react-router-dom';
import { User as UserIcon, Settings, ShoppingBag, Heart, LogOut, ChevronRight, Plus, LogIn, Shield, Package, Camera, Wallet, History, ArrowUpRight, ArrowDownLeft, X, Sparkles, Coins, Loader2, Layout, Bell, Trash2, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

import { collection, query, where, getDocs, onSnapshot, orderBy, writeBatch, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/utils';
import { updateProfile } from 'firebase/auth';

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
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
  // Don't throw here to avoid crashing the component
}

export default function Profile() {
  const { wishlist } = useWishlist();
  const { 
    user, 
    userData, 
    role, 
    loading, 
    loginWithGoogle, 
    loginWithEmail, 
    signupWithEmail, 
    logout, 
    isMaintenanceMode, 
    toggleMaintenanceMode, 
    isNative,
    requestImagePick,
    splashImageUrl,
    updateSplashImage,
    splashDuration,
    updateSplashDuration
  } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [showSplashModal, setShowSplashModal] = useState(false);
  const [splashModalUploading, setSplashModalUploading] = useState(false);
  const splashModalFileInputRef = useRef<HTMLInputElement>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Auth Form State
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSharing = useRef(false);
  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;

  const handleSplashImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setSplashModalUploading(true);
    const toastId = toast.loading("Compressing and updating splash screen image...");
    try {
      const file = files[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const compressed = await compressImage(base64, 1200, 1200, 0.6);
      await updateSplashImage(compressed);
      toast.success("Splash screen photo updated!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update custom splash photo", { id: toastId });
    } finally {
      setSplashModalUploading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        if (!identifier || !password) {
          toast.error("Please enter email/mobile and password.");
          return;
        }
        await loginWithEmail(identifier, password);
      } else {
        if (!email || !phone || !password || !name) {
          toast.error("Please fill in all fields.");
          return;
        }
        await signupWithEmail(email, phone, password, name);
      }
    } catch (error) {
      // Error handled in AuthContext
    } finally {
      setAuthLoading(false);
    }
  };

  const [localMaintenance, setLocalMaintenance] = useState(isMaintenanceMode);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setLocalMaintenance(isMaintenanceMode);
  }, [isMaintenanceMode]);

  const handleMaintenanceToggle = async () => {
    setIsToggling(true);
    await toggleMaintenanceMode(!localMaintenance);
    setIsToggling(false);
  };

  const isTribeMember = userData?.isTribeMember || isPrimaryAdmin;

  const handleProfilePictureClick = () => {
    if (isNative) {
      toast.info("Opening app gallery...");
      requestImagePick('gallery');
      // Fallback timer: if nothing happens, allow standard click
      setTimeout(() => {
        if (!isUploading) {
          toast.info("Using standard picker fallback...");
          fileInputRef.current?.click();
        }
      }, 3000);
    } else {
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (!isNative) return;

    const handleNativeImage = async (event: any) => {
      const data = event.detail?.data || event.detail;
      const base64 = data?.image || data?.base64 || data?.data;
      
      if (!base64) {
        console.warn("Native Image: No base64 data received", data);
        return;
      }

      setIsUploading(true);
      const toastId = toast.loading("Updating your tribe aesthetic...");

      try {
        // Enforce data URL prefix if missing
        const formattedBase64 = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
        const compressedBase64 = await compressImage(formattedBase64, 400, 400, 0.7);

        // Update Firestore
        const userRef = doc(db, 'users', user!.uid);
        await updateDoc(userRef, {
          photoURL: compressedBase64
        });

        // Update Auth Profile
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            photoURL: compressedBase64
          });
        }

        toast.success("Profile picture updated!", { id: toastId });
      } catch (error) {
        console.error("Native Image Error:", error);
        toast.error("Failed to update profile", { id: toastId });
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener('flutterImageSuccess' as any, handleNativeImage);
    return () => window.removeEventListener('flutterImageSuccess' as any, handleNativeImage);
  }, [isNative, user]);

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Updating your tribe aesthetic...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const rawBase64 = await base64Promise;
      const compressedBase64 = await compressImage(rawBase64, 400, 400, 0.7);

      // Update Firestore
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        photoURL: compressedBase64
      });

      // Update Auth Profile (for consistency)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: compressedBase64
        });
      }

      toast.success("Profile picture updated!", { id: toastId });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      toast.error("Failed to update profile", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRedeemPoints = async () => {
    const points = userData?.namatePoints || 0;
    if (points < 1) {
      toast.error("Minimum 1 coin required to convert");
      return;
    }

    setIsRedeeming(true);
    const amountToCredit = points;
    const pointsToDeduct = points;

    const toastId = toast.loading("Converting points to credits...");

    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user!.uid);

      // 1. Update Balance and Points
      batch.update(userRef, {
        walletBalance: increment(amountToCredit),
        namatePoints: increment(-pointsToDeduct)
      });

      // 2. Record Wallet Transaction
      const walletTransRef = doc(collection(db, 'users', user!.uid, 'transactions'));
      batch.set(walletTransRef, {
        amount: amountToCredit,
        type: 'credit',
        description: `Point Redemption (${pointsToDeduct} points)`,
        createdAt: serverTimestamp()
      });

      // 3. Record Points History
      const pointsHistoryRef = doc(collection(db, 'users', user!.uid, 'points_history'));
      batch.set(pointsHistoryRef, {
        points: pointsToDeduct,
        type: 'redeem',
        description: `Converted to ₹${amountToCredit} credit`,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      toast.success(`Converted ${pointsToDeduct} points to ₹${amountToCredit}!`, { id: toastId });
      setShowRedemptionModal(false);
    } catch (error) {
      console.error("Redemption error:", error);
      toast.error("Failed to redeem points", { id: toastId });
    } finally {
      setIsRedeeming(false);
    }
  };
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrderCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const tQ = query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'));
    const tUnsubscribe = onSnapshot(tQ, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() })));
    });

    return () => {
      unsubscribe();
      tUnsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center pt-12 pb-32 px-4 overflow-y-auto no-scrollbar relative z-[200]">
        <div className="w-full max-w-sm">
          <div className="w-16 h-16 bg-black/5 rounded-[20px] flex items-center justify-center mb-6 mx-auto">
            <UserIcon className="w-8 h-8 text-black/20" />
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-black">
              {authMode === 'login' ? 'Welcome Back' : 'Join the Tribe'}
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 mt-2">
              {authMode === 'login' ? 'Continue your aesthetic journey' : 'Experience the essence of nature'}
            </p>
          </div>

          <div className="bg-black/5 p-2 rounded-[28px] flex mb-8">
            <button 
              onClick={() => setAuthMode('login')}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all",
                authMode === 'login' ? "bg-white text-black shadow-sm" : "text-black/40"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={cn(
                "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all",
                authMode === 'signup' ? "bg-white text-black shadow-sm" : "text-black/40"
              )}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-4">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-14 bg-black/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-black/5 transition-all outline-none"
                  required
                />
              </div>
            )}

            {authMode === 'login' ? (
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-4">Email or Mobile</label>
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or 10-digit mobile"
                  className="w-full h-14 bg-black/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-black/5 transition-all outline-none"
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-4">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@tribe.com"
                    className="w-full h-14 bg-black/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-black/5 transition-all outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-4">Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold text-black/40">+91</span>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setPhone(val);
                      }}
                      placeholder="9876543210"
                      className="w-full h-14 bg-black/5 border-none rounded-2xl pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-black/5 transition-all outline-none"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase tracking-widest text-black/40 ml-4">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 bg-black/5 border-none rounded-2xl px-6 text-sm font-bold focus:ring-2 focus:ring-black/5 transition-all outline-none"
                required
              />
            </div>

            <Button 
              type="submit"
              disabled={authLoading}
              className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-gray-900 transition-all flex items-center justify-center gap-3 mt-4"
            >
              {authLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {authMode === 'login' ? 'ENTER THE TRIBE' : 'BECOME A MEMBER'}
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-8">
            <div className="h-[1px] flex-grow bg-black/5" />
            <span className="text-[8px] font-black uppercase tracking-widest text-black/20">OR</span>
            <div className="h-[1px] flex-grow bg-black/5" />
          </div>

          <Button 
            onClick={loginWithGoogle}
            variant="outline"
            className="w-full h-16 bg-white border-2 border-black/5 text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            CONTINUE WITH GOOGLE
          </Button>

          <div className="mt-12">
            <BrandSignature variant="light" className="opacity-10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-black/5 py-12 border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6">
          <div className="relative group/avatar">
            <div 
              className={cn(
                "w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden relative",
                !isUploading && "cursor-pointer"
              )}
              onClick={!isUploading ? handleProfilePictureClick : undefined}
            >
              {(userData?.photoURL || user.photoURL) ? (
                <img src={userData?.photoURL || user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-white" />
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {!isUploading && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black">{user.displayName || 'Sathya Nexus'}</h1>
            </div>
            <p className="text-black/40 font-medium">{user.email}</p>
            {isTribeMember ? (
              <div className="mt-2 inline-block bg-black text-[#C5A059] text-[10px] font-black px-2 py-0.5 uppercase tracking-widest">
                Namate Tribe Member
              </div>
            ) : (
              <Link to="/tribe" className="mt-2 inline-block bg-black/10 text-black/60 text-[10px] font-black px-2 py-0.5 uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
                Join the Tribe
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Wallet Section */}
        <div className="mb-12">
          <div className="bg-black text-white rounded-[40px] p-8 shadow-2xl shadow-black/20 overflow-hidden relative group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[#C5A059]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Tribe Wallet</span>
                </div>
                <button 
                  onClick={() => setShowTransactions(true)}
                  className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <History className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col">
                <span className="text-5xl font-brand font-medium tracking-tighter mb-2">
                  ₹{userData?.walletBalance || 0}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Available Credits</span>
              </div>

              {/* Namate Points Highlight */}
              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#C5A059]/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#C5A059]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-white">{userData?.namatePoints || 0} Points</h4>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Namate Rewards</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowRedemptionModal(true)}
                  className="bg-[#C5A059] text-black h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#D4AF37] transition-all"
                >
                  REDEEM
                </Button>
              </div>

              <div className="mt-8 flex gap-3">
                <Button className="flex-1 h-14 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/90 transition-all">
                  Load Credits
                </Button>
                <Button variant="outline" className="flex-1 h-14 border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">
                  Redeem Code
                </Button>
              </div>
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <RegalDiamond className="w-32 h-32" />
            </div>
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-[#C5A059]/10 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Refer & Earn Section */}
        <div className="mb-12 p-8 bg-gradient-to-br from-black to-gray-900 rounded-[40px] text-white overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#C5A059]" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Refer & Earn</h3>
            </div>
            <p className="text-white/60 text-sm font-medium mb-8 max-w-[280px]">
              Earn 100 Namate Points for every friend you refer to the tribe. Automatically earn points when they shop via your link.
            </p>
            
            <div className="bg-white/5 rounded-2xl p-4 mb-6 flex items-center justify-between border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">My Code</span>
                <span className="text-xl font-black uppercase tracking-tighter text-[#C5A059]">{userData?.referralCode || '...'}</span>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(userData?.referralCode || '');
                  toast.success("Code copied!");
                }}
                className="h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                Copy
              </Button>
            </div>

            <Button 
              onClick={async () => {
                if (isSharing.current) return;
                const url = `${window.location.origin}/?ref=${userData?.referralCode}`;
                
                if (navigator.share) {
                  isSharing.current = true;
                  try {
                    await navigator.share({
                      title: 'Join Namate!',
                      text: 'Use my code to join Namate and get special perks!',
                      url: url
                    });
                  } catch (error: any) {
                    if (error.name !== 'AbortError') {
                      console.error("Error sharing:", error);
                    }
                  } finally {
                    isSharing.current = false;
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Referral link copied!");
                  } catch (error) {
                    console.error("Clipboard error:", error);
                  }
                }
              }}
              className="w-full h-14 bg-[#C5A059] text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-[#D4AF37] transition-all"
            >
              SHARE REFERRAL LINK
            </Button>
          </div>
          
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <RegalDiamond className="w-32 h-32" />
          </div>
        </div>

        <div className="space-y-4">
          <Link to="/my-orders" className="w-full flex items-center justify-between p-6 border-2 border-black/5 rounded-2xl hover:border-black/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black transition-colors">
                <ShoppingBag className="w-5 h-5 text-black/40 group-hover:text-white" />
              </div>
              <span className="font-black uppercase tracking-tight text-black">My Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-black/20">{orderCount} Orders</span>
              <ChevronRight className="w-5 h-5 text-black/10 group-hover:text-black transition-colors" />
            </div>
          </Link>

          <Link to="/wishlist" className="w-full flex items-center justify-between p-6 border-2 border-black/5 rounded-2xl hover:border-black/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black transition-colors">
                <Heart className="w-5 h-5 text-black/40 group-hover:text-white" />
              </div>
              <span className="font-black uppercase tracking-tight text-black">Wishlist</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-black/20">{wishlist.length} Items</span>
              <ChevronRight className="w-5 h-5 text-black/10 group-hover:text-black transition-colors" />
            </div>
          </Link>

          <button className="w-full flex items-center justify-between p-6 border-2 border-black/5 rounded-2xl hover:border-black/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black transition-colors">
                <Settings className="w-5 h-5 text-black/40 group-hover:text-white" />
              </div>
              <span className="font-black uppercase tracking-tight text-black">Account Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-black/10 group-hover:text-black transition-colors" />
            </div>
          </button>

          <button 
            onClick={logout}
            className="w-full flex items-center justify-between p-6 border-2 border-red-900/20 rounded-2xl hover:bg-red-900/10 transition-all group mt-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-900/20 rounded-full flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-black uppercase tracking-tight text-red-500">Logout</span>
            </div>
          </button>
        </div>

        {/* Seller Section */}
        {isAdmin && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-black/20">Seller Dashboard</h2>
              <div className="h-[1px] flex-grow bg-black/5 ml-4" />
            </div>
            
            <Link 
              to="/orders-dashboard"
              className="w-full flex items-center justify-between p-8 bg-black text-white rounded-[32px] hover:bg-black/90 transition-all group shadow-xl shadow-black/10"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Manage Orders</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">View and process tribe orders</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-white transition-colors" />
            </Link>

            {/* Maintenance Mode Toggle Card */}
            <div className="w-full p-8 bg-white border-2 border-red-100 rounded-[32px] group">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    isMaintenanceMode ? "bg-red-600 text-white" : "bg-green-100 text-green-600"
                  )}>
                    <Settings className="w-8 h-8" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-black">
                      {isMaintenanceMode ? 'Site is Offline' : 'Site is Live'}
                    </h3>
                    <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">
                      {isMaintenanceMode ? 'Maintainence mode active' : 'Visitors can shop normally'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleMaintenanceToggle}
                  disabled={isToggling}
                  className={cn(
                    "relative w-16 h-8 rounded-full p-1 transition-colors duration-300",
                    isMaintenanceMode ? "bg-red-600" : "bg-gray-200"
                  )}
                >
                   <motion.div
                     animate={{ x: isMaintenanceMode ? 32 : 0 }}
                     transition={{ type: "spring", stiffness: 500, damping: 30 }}
                     className="w-6 h-6 bg-white rounded-full shadow-md"
                   />
                </button>
              </div>
            </div>
            
            <Link 
              to="/manage-appearance"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group animate-fade-in"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Layout className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter col-layout">Site Aesthetics</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Change branding, banner colors, text styles</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-notifications"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Bell className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Broadcast</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Send offers and updates</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-products"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-black" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Manage Products</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Edit or delete tribe items</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/add-product"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Plus className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Add Product</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">List new items for the tribe</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-offers"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Percent className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Offers & Spotlight</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Configure secondary showcase banner & offers</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-gallery"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Camera className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Manage Gallery</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Update store lookbook images</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-categories"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Layout className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Manage Categories</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Customize home page category strips</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <Link 
              to="/manage-wallets"
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Wallet className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Fund Wallets</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Add credits to tribe members</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </Link>

            <button 
              onClick={() => setShowSplashModal(true)}
              className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group text-left"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Camera className="w-8 h-8 text-black group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-black">Splash Screen</h3>
                  <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">
                    {splashImageUrl ? 'Custom splash screen active' : 'Default direct load active'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
            </button>

            {isPrimaryAdmin && (
              <Link 
                to="/manage-admins"
                className="w-full flex items-center justify-between p-8 bg-black/5 border-2 border-black/5 text-black rounded-[32px] hover:border-black/20 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                    <Shield className="w-8 h-8 text-black group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Manage Admins</h3>
                    <p className="text-black/40 text-[10px] font-bold uppercase tracking-widest">Promote or demote tribe members</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-black/20 group-hover:text-black transition-colors" />
              </Link>
            )}
          </div>
        )}

        <div className="mt-12 p-8 bg-black/5 border-2 border-black/10 rounded-3xl text-center">
          <h3 className="text-xl font-black uppercase mb-2 text-black">Want more perks?</h3>
          <p className="text-sm text-black/60 font-medium mb-6">Upgrade to Namate Regal for exclusive benefits and priority service.</p>
          <Button className="bg-black text-white font-black px-8 py-4 rounded-none hover:bg-gray-900 hover:text-white transition-colors">
            EXPLORE REGAL
          </Button>
        </div>
      </div>
      <BrandSignature variant="dark" className="mb-20 opacity-20" />

      {/* Splash Screen Modal */}
      <AnimatePresence>
        {showSplashModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center relative overflow-hidden"
            >
              <button 
                onClick={() => setShowSplashModal(false)}
                className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 active:scale-95 transition-all text-black/60"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-20 h-20 bg-[#C5A059]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#C5A059]/5">
                <Camera className="w-10 h-10 text-[#C5A059]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Splash Screen</h2>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-6 border-b border-black/5 pb-2">Manage brand startup screen</p>
              
              {/* Visual preview slot */}
              {splashImageUrl ? (
                <div className="relative aspect-[3/4] w-40 rounded-3xl overflow-hidden mx-auto mb-6 shadow-2xl border border-black/5">
                  <img src={splashImageUrl} className="w-full h-full object-cover" alt="Splash preview" referrerPolicy="no-referrer" />
                  <button 
                    onClick={async () => {
                      if (confirm("Remove custom splash screen and load immediately?")) {
                        await updateSplashImage('');
                      }
                    }}
                    className="absolute bottom-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 active:scale-95 transition-all"
                    title="Remove custom splash photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-black/[0.03] rounded-3xl p-6 mb-6 text-left border border-dashed border-black/10 text-center flex flex-col justify-center items-center py-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] mb-1">Direct Load Active</span>
                  <span className="text-[9px] font-bold text-black/40 uppercase tracking-widest max-w-[180px] leading-relaxed">
                    No photo set. Visitors bypass splash delays entirely.
                  </span>
                </div>
              )}

              {/* stay duration slider */}
              <div className="mb-6 bg-black/[0.02] p-4 rounded-3xl border border-black/5 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Stay Duration</span>
                  <span className="text-xs font-black text-[#C5A059] font-mono">{(splashDuration / 1000).toFixed(1)} seconds</span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={splashDuration / 1000}
                  onChange={async (e) => {
                    const sec = parseFloat(e.target.value);
                    const ms = Math.round(sec * 1000);
                    await updateSplashDuration(ms);
                  }}
                  className="w-full accent-[#C5A059] cursor-pointer"
                />
                <p className="text-[7.5px] font-bold text-black/30 uppercase tracking-widest mt-2 leading-relaxed">
                  Adjust how long the splash screen presents to visitors. Minimum 0.5s for seamless visuals.
                </p>
              </div>

              <input 
                type="file" 
                ref={splashModalFileInputRef} 
                onChange={handleSplashImageSelect} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowSplashModal(false)}
                  className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => splashModalFileInputRef.current?.click()}
                  disabled={splashModalUploading}
                  className="flex-1 h-14 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black/90"
                >
                  {splashModalUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Photo'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redemption Modal */}
      <AnimatePresence>
        {showRedemptionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] p-8 text-center"
            >
              <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/20">
                <Coins className="w-10 h-10 text-[#C5A059]" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Point Conversion</h2>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-8">1 Coin = ₹1 Credit</p>
              
              <div className="bg-black/5 rounded-3xl p-6 mb-8 text-left">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Your Points</span>
                  <span className="font-brand font-medium tracking-tighter text-black text-xl">{userData?.namatePoints || 0}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-black/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Convertible</span>
                  <span className="font-brand font-medium tracking-tighter text-green-600 text-xl">₹{userData?.namatePoints || 0}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowRedemptionModal(false)}
                  className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                >
                  Later
                </Button>
                <Button 
                  onClick={handleRedeemPoints}
                  disabled={isRedeeming || (userData?.namatePoints || 0) < 1}
                  className="flex-1 h-14 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black/90"
                >
                  {isRedeeming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Convert'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Modal */}
      <AnimatePresence>
        {showTransactions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[48px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl shadow-black/40"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                    <History className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-black">Transaction History</h2>
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Your digital footprint</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTransactions(false)}
                  className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6 no-scrollbar">
                {transactions.length > 0 ? (
                  transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          t.type === 'credit' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                        )}>
                          {t.type === 'credit' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-tight text-black text-sm">{t.description}</p>
                          <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">
                            {t.createdAt.toLocaleDateString()} • {t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-black tracking-tighter",
                          t.type === 'credit' ? "text-green-600" : "text-black"
                        )}>
                          {t.type === 'credit' ? '+' : '-'}₹{t.amount}
                        </p>
                        {t.orderId && (
                          <p className="text-[8px] font-black uppercase tracking-widest text-black/10">Order ID: {t.orderId.slice(-6)}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                    <History className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No activity detected</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-black/5 shrink-0">
                <Button 
                  onClick={() => setShowTransactions(false)}
                  className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]"
                >
                  CLOSE HISTORY
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
