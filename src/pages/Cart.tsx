import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, ChevronRight, Loader2, ChevronLeft, Heart, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import BrandSignature from '@/components/BrandSignature';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { collection, addDoc, serverTimestamp, doc, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useState } from 'react';
import { toast } from 'sonner';

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
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const { user, loginWithGoogle } = useAuth();
  const userData = user as any;
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [usePoints, setUsePoints] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  
  // Points logic: 100 points = ₹10 => 1 point = ₹0.1
  const maxPointsPossible = Math.min(userData?.namatePoints || 0, subtotal * 10);
  const pointsDiscount = usePoints ? Math.floor(maxPointsPossible / 100) * 10 : 0;
  const pointsToSpend = usePoints ? Math.floor(maxPointsPossible / 100) * 100 : 0;
  
  const total = Math.max(0, subtotal + shipping - pointsDiscount);

  const handleMoveToWishlist = (item: any) => {
    addToWishlist({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image
    });
    removeFromCart(item.id, item.size);
    toast.success("Moved to wishlist", {
      description: `${item.name} is now saved for later.`
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.info("Please login to complete your order");
      loginWithGoogle();
      return;
    }

    setIsCheckingOut(true);
    try {
      const batch = writeBatch(db);
      const orderId = doc(collection(db, 'orders')).id;
      const orderRef = doc(db, 'orders', orderId);
      
      const coinsToAward = Math.floor(total / 1000) * 100;
      const shouldAwardNow = paymentMethod === 'online' && coinsToAward > 0;

      // Check for referral
      let referrerId = userData?.referredBy || '';
      if (!referrerId) {
        const referralSource = sessionStorage.getItem('referral_source');
        if (referralSource) {
          const q = query(collection(db, 'users'), where('referralCode', '==', referralSource));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            referrerId = qSnap.docs[0].id;
          }
        }
      }

      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        referrerId: referrerId,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image
        })),
        total: total,
        pointsDiscount: pointsDiscount,
        pointsSpent: pointsToSpend,
        status: 'pending',
        paymentMethod: paymentMethod,
        paymentStatus: total === 0 ? 'paid' : (paymentMethod === 'online' ? 'paid' : 'unpaid'),
        pointsAwarded: shouldAwardNow,
        createdAt: serverTimestamp()
      };

      batch.set(orderRef, orderData);

      // Handle referral bonus for referrer
      if (referrerId && referrerId !== user.uid) {
        const referrerRef = doc(db, 'users', referrerId);
        batch.update(referrerRef, {
          namatePoints: increment(100)
        });
        const referrerPointsRef = doc(collection(db, 'users', referrerId, 'points_history'));
        batch.set(referrerPointsRef, {
          points: 100,
          type: 'earn',
          description: `Referral purchase by ${user.email}`,
          createdAt: serverTimestamp()
        });
        sessionStorage.removeItem('referral_source'); // Use once per link/session
      }

      // 1. Handle Spending Points
      if (pointsToSpend > 0) {
        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, {
          namatePoints: increment(-pointsToSpend)
        });

        const pointsSpentRef = doc(collection(db, 'users', user.uid, 'points_history'));
        batch.set(pointsSpentRef, {
          points: pointsToSpend,
          type: 'redeem',
          description: `Used for Order #${orderId.slice(-6)}`,
          createdAt: serverTimestamp()
        });
      }

      // 2. Handle Awarding Points for the cash part
      if (shouldAwardNow) {
        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, {
          namatePoints: increment(coinsToAward)
        });

        const pointsEarnRef = doc(collection(db, 'users', user.uid, 'points_history'));
        batch.set(pointsEarnRef, {
          points: coinsToAward,
          type: 'earn',
          description: `Purchase reward (Order: ${orderId.slice(-6)})`,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      
      clearCart();
      if (shouldAwardNow) {
        toast.success("Order placed! + " + coinsToAward + " coins awarded.", {
          description: "Your tribe status is rising."
        });
      } else {
        toast.success("Order placed successfully!", {
          description: "The tribe is processing your request."
        });
      }
      navigate('/profile');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-24 h-24 bg-black/5 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-black/10" />
        </div>
        <h1 className="text-2xl font-black mb-2 uppercase tracking-tighter text-black">Your cart is empty</h1>
        <p className="text-black/40 mb-8 font-bold text-center">Add some styles to your cart to see them here.</p>
        <Link to="/shop">
          <Button className="bg-black text-white font-black px-10 py-6 rounded-full mb-12">START SHOPPING</Button>
        </Link>
        <BrandSignature variant="light" className="opacity-20" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-40">
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full bg-black/5"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </Button>
          <div className="flex items-center justify-between flex-grow">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">My Cart</h1>
            <span className="text-xs font-black text-black/40 uppercase tracking-widest">{items.length} Items</span>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div 
                key={item.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex gap-4"
              >
                <div className="w-24 aspect-[4/5] rounded-2xl overflow-hidden flex-shrink-0 bg-black/5">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow flex flex-col py-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-black leading-tight line-clamp-1">{item.name}</h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleMoveToWishlist(item)}
                        className="text-black/20 hover:text-black transition-colors flex items-center gap-1 group/wish"
                      >
                        <Heart className={cn("h-4 w-4", isInWishlist(item.id) && "fill-black text-black")} />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover/wish:opacity-100 transition-opacity">Save</span>
                      </button>
                      <button 
                        onClick={() => removeFromCart(item.id, item.size)}
                        className="text-black/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-3">{item.size || 'No Size'}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-black text-black">₹{item.price}</span>
                    <div className="flex items-center bg-black/5 rounded-full p-1 border border-black/10">
                      <button 
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.size, -1);
                          } else {
                            removeFromCart(item.id, item.size);
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                      >
                        <Minus className="h-3 w-3 text-black" />
                      </button>
                      <span className="px-3 text-xs font-black text-black">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.size, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-black" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Tribe Upsell */}
        <div className="mt-10 p-6 bg-black/5 border-2 border-black/10 rounded-[32px] flex items-center justify-between">
          <div className="flex-grow pr-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-black/40">Tribe Member Perk</p>
            <p className="text-sm font-bold text-black leading-tight">Save ₹250 more on this order!</p>
          </div>
          <Link to="/tribe">
            <Button size="sm" className="bg-black text-white font-black rounded-full px-4 text-[10px]">JOIN NOW</Button>
          </Link>
        </div>

        {/* Summary Info */}
        <div className="mt-10 space-y-4">
          <div className="bg-black/5 rounded-[32px] p-6 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-black/40">Select Payment Frequency</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaymentMethod('online')}
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                  paymentMethod === 'online' ? "bg-black text-white border-black" : "bg-white text-black border-black/5"
                )}
              >
                Online Pay
              </button>
              <button 
                onClick={() => setPaymentMethod('cod')}
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                  paymentMethod === 'cod' ? "bg-black text-white border-black" : "bg-white text-black border-black/5"
                )}
              >
                Cash on Delivery
              </button>
            </div>
            {paymentMethod === 'online' && total >= 1000 && (
              <p className="mt-4 text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Pay now to earn {Math.floor(total / 1000) * 100} Namate Coins immediately!
              </p>
            )}
            {paymentMethod === 'cod' && total >= 1000 && (
              <p className="mt-4 text-[10px] font-black text-black/40 uppercase tracking-widest">
                Coins will be credited after successful delivery.
              </p>
            )}
          </div>

          {/* Loyalty Points Merge Option */}
          {userData && (userData.namatePoints || 0) >= 100 && (
            <div className={cn(
              "p-6 rounded-[32px] border-2 transition-all",
              usePoints ? "bg-black border-black" : "bg-black/5 border-black/5"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    usePoints ? "bg-[#C5A059]" : "bg-black/10"
                  )}>
                    <Sparkles className={cn("w-5 h-5", usePoints ? "text-white" : "text-black/20")} />
                  </div>
                  <div>
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", usePoints ? "text-[#C5A059]" : "text-black/40")}>Namate Points</p>
                    <p className={cn("text-sm font-bold", usePoints ? "text-white" : "text-black")}>
                      {userData.namatePoints.toLocaleString()} Available
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setUsePoints(!usePoints)}
                  className={cn(
                    "w-14 h-8 rounded-full transition-all relative",
                    usePoints ? "bg-[#C5A059]" : "bg-black/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm",
                    usePoints ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              {usePoints && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Applying Discount</p>
                  <div className="flex justify-between items-end">
                    <p className="text-xl font-black text-white">₹{pointsDiscount}</p>
                    <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest">
                      Burning {pointsToSpend.toLocaleString()} Points
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-black/40 uppercase tracking-widest">Subtotal</span>
            <span className="text-sm font-black text-black">₹{subtotal}</span>
          </div>
          {pointsDiscount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#C5A059] uppercase tracking-widest">Points Discount</span>
              <span className="text-sm font-black text-[#C5A059]">-₹{pointsDiscount}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-black/40 uppercase tracking-widest">Shipping</span>
            <span className="text-sm font-black text-green-600 uppercase">Free</span>
          </div>
          <Separator className="bg-black/10" />
          <div className="flex justify-between items-center">
            <span className="text-base font-black uppercase tracking-tighter text-black">Total</span>
            <span className="text-xl font-black text-black">₹{total}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Checkout Bar */}
      <div className="fixed bottom-28 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-md mx-auto bg-black p-3 rounded-[32px] shadow-2xl flex items-center justify-between pointer-events-auto">
          <div className="pl-6">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Pay</p>
            <p className="text-lg font-black text-white leading-none">₹{total}</p>
          </div>
          <Button 
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="h-14 bg-black text-white font-black text-base rounded-full px-10 hover:opacity-90 transition-all group"
          >
            {isCheckingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                CHECKOUT
                <ChevronRight className="ml-1 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
      <BrandSignature variant="dark" className="mb-20 opacity-20" />
    </div>
  );
}
