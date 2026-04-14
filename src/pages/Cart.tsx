import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, ChevronRight, Loader2, ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import BrandSignature from '@/components/BrandSignature';
import { useAuth } from '@/lib/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const { user, loginWithGoogle } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;

  const handleCheckout = async () => {
    if (!user) {
      toast.info("Please login to complete your order");
      loginWithGoogle();
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          image: item.image
        })),
        total: total,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      clearCart();
      toast.success("Order placed successfully!", {
        description: "The tribe is processing your request."
      });
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
                    <button 
                      onClick={() => removeFromCart(item.id, item.size)}
                      className="text-black/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-black/40 uppercase tracking-widest">Subtotal</span>
            <span className="text-sm font-black text-black">₹{subtotal}</span>
          </div>
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
