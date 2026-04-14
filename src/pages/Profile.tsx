import { Link } from 'react-router-dom';
import { User as UserIcon, Settings, ShoppingBag, Heart, LogOut, ChevronRight, Plus, LogIn, Shield, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RegalDiamond from '@/components/RegalDiamond';
import BrandSignature from '@/components/BrandSignature';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';

import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';

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
  const isPrimaryAdmin = user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const isAdmin = role === 'admin' || isPrimaryAdmin;
  const isTribeMember = userData?.isTribeMember || isPrimaryAdmin;

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrderCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
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
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-12 h-12 text-white" />
            )}
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
              <h2 className="text-sm font-black uppercase tracking-widest text-white/20">Seller Dashboard</h2>
              <div className="h-[1px] flex-grow bg-white/5 ml-4" />
            </div>
            
            <Link 
              to="/orders-dashboard"
              className="w-full flex items-center justify-between p-8 bg-black text-white rounded-[32px] hover:bg-gray-900 transition-all group shadow-xl shadow-black/20"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-8 h-8 text-[#F7E08A]" />
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
              className="w-full flex items-center justify-between p-8 bg-gray-100 text-black rounded-[32px] hover:bg-gray-200 transition-all group shadow-xl shadow-black/5"
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
              className="w-full flex items-center justify-between p-8 bg-white/5 border-2 border-white/10 text-white rounded-[32px] hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                  <Plus className="w-8 h-8 text-white group-hover:text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Add Product</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">List new items for the tribe</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-white transition-colors" />
            </Link>

            {isPrimaryAdmin && (
              <Link 
                to="/manage-admins"
                className="w-full flex items-center justify-between p-8 bg-white/5 border-2 border-white/10 text-white rounded-[32px] hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-black transition-colors">
                    <Shield className="w-8 h-8 text-white group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Manage Admins</h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Promote or demote tribe members</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-white transition-colors" />
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
    </div>
  );
}
