import { Link } from 'react-router-dom';
import { User as UserIcon, Settings, ShoppingBag, Heart, LogOut, ChevronRight, Plus, LogIn, Shield, Package, Camera, Wallet, History, ArrowUpRight, ArrowDownLeft, X, Sparkles, Coins, Loader2, Layout } from 'lucide-react';
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
  const { user, userData, role, loading, loginWithGoogle, logout } = useAuth();
  const [orderCount, setOrderCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;
  const isTribeMember = userData?.isTribeMember || isPrimaryAdmin;

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

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
    if (points < 100) {
      toast.error("Minimum 100 points required to convert");
      return;
    }

    setIsRedeeming(true);
    const amountToCredit = Math.floor(points / 100) * 10;
    const pointsToDeduct = Math.floor(points / 100) * 100;

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-32">
        <div className="w-24 h-24 bg-black/5 rounded-full flex items-center justify-center mb-8">
          <UserIcon className="w-12 h-12 text-black/20" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center text-black">Join the Tribe</h1>
        <p className="text-black/40 font-medium text-center mb-10 max-w-xs">
          Sign in to track your orders, save your wishlist, and get exclusive tribe perks.
        </p>
        <Button 
          onClick={loginWithGoogle}
          className="w-full max-w-xs h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-3 mb-12"
        >
          <LogIn className="w-5 h-5" />
          LOGIN WITH GOOGLE
        </Button>
        <BrandSignature variant="light" className="opacity-20" />
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
              onClick={() => {
                const url = `${window.location.origin}/?ref=${userData?.referralCode}`;
                if (navigator.share) {
                  navigator.share({
                    title: 'Join Namate!',
                    text: 'Use my code to join Namate and get special perks!',
                    url: url
                  });
                } else {
                  navigator.clipboard.writeText(url);
                  toast.success("Referral link copied!");
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
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-8">100 Points = ₹10 Credit</p>
              
              <div className="bg-black/5 rounded-3xl p-6 mb-8 text-left">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Your Points</span>
                  <span className="font-brand font-medium tracking-tighter text-black text-xl">{userData?.namatePoints || 0}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-black/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-black/20">Convertible</span>
                  <span className="font-brand font-medium tracking-tighter text-green-600 text-xl">₹{Math.floor((userData?.namatePoints || 0) / 100) * 10}</span>
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
                  disabled={isRedeeming || (userData?.namatePoints || 0) < 100}
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
