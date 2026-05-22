import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, ChevronRight, Loader2, ChevronLeft, Heart, Sparkles, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import BrandSignature from '@/components/BrandSignature';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { collection, addDoc, serverTimestamp, doc, writeBatch, increment, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useState, useEffect } from 'react';
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

import { triggerHaptic } from '@/lib/haptics';

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const { user, loginWithGoogle, userData: profileData, isNative, requestNativeLocation } = useAuth();
  const userData = profileData as any;
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [usePoints, setUsePoints] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [isLocationAutofilled, setIsLocationAutofilled] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [shippingDetails, setShippingDetails] = useState({
    receiverName: '',
    mobileNumber: '',
    pincode: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    lat: null as number | null,
    lng: null as number | null
  });

  // Load saved address
  useEffect(() => {
    if (userData?.savedShippingDetails) {
      setShippingDetails(prev => ({
        ...prev,
        ...userData.savedShippingDetails
      }));
    } else if (user?.displayName && !shippingDetails.receiverName) {
      setShippingDetails(prev => ({ ...prev, receiverName: user.displayName }));
    }
  }, [userData, user?.displayName]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  
  // Points logic: 100 points = ₹10 => 1 point = ₹0.1
  const maxPointsPossible = Math.min(userData?.namatePoints || 0, subtotal * 10);
  const pointsDiscount = usePoints ? Math.floor(maxPointsPossible / 100) * 10 : 0;
  const pointsToSpend = usePoints ? Math.floor(maxPointsPossible / 100) * 100 : 0;
  
  const total = Math.max(0, subtotal + shipping - pointsDiscount);

  const fetchCityStateByPincode = async (pincode: string) => {
    if (pincode.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setShippingDetails(prev => ({
            ...prev,
            city: postOffice.District,
            state: postOffice.State
          }));
        }
      } catch (error) {
        console.error("Pincode lookup failed", error);
      }
    }
  };

  // Handle Flutter Location Response
  useEffect(() => {
    if (!isNative) return;

    const handleFlutterLocation = (event: any) => {
      try {
        const data = event.detail?.data || (typeof event.data === 'string' ? JSON.parse(event.data) : event.data);
        if (data.type === 'FLUTTER_LOCATION_SUCCESS' && (data.latitude || data.lat)) {
          const latitude = data.latitude || data.lat;
          const longitude = data.longitude || data.lng;
          
          processLocation(latitude, longitude);
        }
        if (data.type === 'FLUTTER_LOCATION_ERROR') {
          setFetchingLocation(false);
          toast.error("App Location Failed", { description: data.error || "Permission denied" });
        }
      } catch (e) {
        // Not for us
      }
    };

    window.addEventListener('message', handleFlutterLocation);
    window.addEventListener('flutterLocationSuccess', handleFlutterLocation);
    return () => {
      window.removeEventListener('message', handleFlutterLocation);
      window.removeEventListener('flutterLocationSuccess', handleFlutterLocation);
    };
  }, [isNative]);

  const processLocation = async (latitude: number, longitude: number) => {
    try {
      setFetchingLocation(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      
      if (data.address) {
        const address = data.address;
        const pc = address.postcode?.replace(/\s/g, '').slice(0, 6);
        
        const streetInfo = [
          address.road,
          address.suburb,
          address.neighbourhood,
          address.industrial,
          address.commercial
        ].filter(Boolean).join(', ');

        const landmarkInfo = [
          address.amenity,
          address.building,
          address.historic,
          address.retail,
          address.office
        ].filter(Boolean).slice(0, 1).join('');

        setShippingDetails(prev => ({
          ...prev,
          pincode: (pc && pc.length === 6) ? pc : prev.pincode,
          city: address.city || address.town || address.village || address.county || prev.city,
          state: address.state || prev.state,
          street: streetInfo || prev.street,
          landmark: landmarkInfo || address.suburb || address.neighbourhood || prev.landmark,
          lat: latitude,
          lng: longitude
        }));
        setIsLocationAutofilled(true);
        toast.success("Location details locked and filled!");
      }
    } catch (error) {
      console.error("Location fetch failed", error);
      toast.error("Failed to reverse geocode");
    } finally {
      setFetchingLocation(false);
    }
  };

  const useCurrentLocation = () => {
    if (isNative) {
      setFetchingLocation(true);
      requestNativeLocation();
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      processLocation(position.coords.latitude, position.coords.longitude);
    }, (error) => {
      setFetchingLocation(false);
      if (error.code === error.PERMISSION_DENIED) {
        toast.error("Location permission denied");
      } else {
        toast.error("Could not get current location");
      }
    });
  };

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

    // Validation
    const { receiverName, mobileNumber, pincode, street } = shippingDetails;
    if (!receiverName || !mobileNumber || !pincode || !street) {
      triggerHaptic('error');
      toast.error("Missing Shipping Details", {
        description: "Please fill in all required shipping information."
      });
      // Scroll to form (approximate)
      window.scrollTo({ top: document.getElementById('shipping-form')?.offsetTop || 0, behavior: 'smooth' });
      return;
    }

    if (mobileNumber.length < 10) {
      toast.error("Invalid Mobile Number");
      return;
    }

    if (pincode.length !== 6) {
      toast.error("Invalid Pincode", { description: "Please enter a 6-digit pincode." });
      return;
    }

    setIsCheckingOut(true);
    try {
      // 1. If online payment, create Cashfree order first
      if (paymentMethod === 'online' && total > 0) {
        try {
          const response = await fetch('/api/cashfree/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              amount: total,
              customer_id: user.uid,
              customer_phone: shippingDetails.mobileNumber,
              customer_email: user.email,
              customer_name: shippingDetails.receiverName || user.displayName
            })
          });
          
          if (!response.ok) {
            const errData = await response.json();
            const detailedError = errData.details || errData.error || "Failed to initiate payment";
            throw new Error(detailedError);
          }
          
          const order = await response.json();
          const paymentSessionId = order.payment_session_id;

          // Initialize Cashfree Checkout
          if (!(window as any).Cashfree) {
            throw new Error("Cashfree SDK failed to load. Please check your internet connection.");
          }

          // --- FLUTTER BRIDGE DETECTION ---
          if ((window as any).FlutterPaymentChannel) {
            console.log("Flutter Bridge Detected - Handing off to native");
            
            (window as any).onFlutterPaymentSuccess = async (paymentId: string) => {
              console.log("Received payment success from Flutter:", paymentId);
              await finalizeOrder(paymentId);
            };

            (window as any).onFlutterPaymentError = (error: string) => {
              console.error("Received payment error from Flutter:", error);
              setIsCheckingOut(false);
              toast.error("Payment Failed", { description: error });
            };

            (window as any).FlutterPaymentChannel.postMessage(JSON.stringify({
              type: 'CASHFREE_PAYMENT',
              paymentSessionId: paymentSessionId
            }));
            return; 
          }
          // --------------------------------

          const cashfree = (window as any).Cashfree({
            mode: import.meta.env.PROD ? "production" : "sandbox"
          });

          // Redirect to Cashfree
          // NOTE: We finalize order as 'unpaid' before redirect so the order is saved
          await finalizeOrder(order.order_id, 'unpaid');

          cashfree.checkout({
            paymentSessionId: paymentSessionId,
            redirectTarget: "_self",
          });

          return; 
        } catch (error: any) {
          console.error("Payment initiation failed:", error);
          toast.error(error.message || "Payment service unavailable");
          setIsCheckingOut(false);
          return;
        }
      }

      // If COD or total is 0, finalize immediately
      await finalizeOrder();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      setIsCheckingOut(false);
    }
  };

  const finalizeOrder = async (payId?: string, forceStatus?: 'unpaid' | 'paid') => {
    try {
      const batch = writeBatch(db);
      const orderId = doc(collection(db, 'orders')).id;
      const orderRef = doc(db, 'orders', orderId);
      
      const coinsToAward = Math.floor(total / 1000) * 100;
      const paymentStatus = forceStatus || ((total === 0 || paymentMethod === 'online') ? 'paid' : 'unpaid');
      const shouldAwardNow = paymentStatus === 'paid' && coinsToAward > 0;

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
        userId: user!.uid,
        userEmail: user!.email,
        userName: user!.displayName,
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
        paymentStatus: paymentStatus,
        paymentId: payId || null,
        shippingDetails: shippingDetails,
        pointsAwarded: shouldAwardNow,
        createdAt: serverTimestamp()
      };

      batch.set(orderRef, orderData);

      // Save address for next time if requested
      if (saveAddress) {
        const userRef = doc(db, 'users', user!.uid);
        batch.update(userRef, {
          savedShippingDetails: shippingDetails
        });
      }

      // Handle referral bonus for referrer
      if (referrerId && referrerId !== user!.uid) {
        const referrerRef = doc(db, 'users', referrerId);
        batch.update(referrerRef, {
          namatePoints: increment(100)
        });
        const referrerPointsRef = doc(collection(db, 'users', referrerId, 'points_history'));
        batch.set(referrerPointsRef, {
          points: 100,
          type: 'earn',
          description: `Referral purchase by ${user!.email}`,
          createdAt: serverTimestamp()
        });
        sessionStorage.removeItem('referral_source'); // Use once per link/session
      }

      // 1. Handle Spending Points
      if (pointsToSpend > 0) {
        const userRef = doc(db, 'users', user!.uid);
        batch.update(userRef, {
          namatePoints: increment(-pointsToSpend)
        });

        const pointsSpentRef = doc(collection(db, 'users', user!.uid, 'points_history'));
        batch.set(pointsSpentRef, {
          points: pointsToSpend,
          type: 'redeem',
          description: `Used for Order #${orderId.slice(-6)}`,
          createdAt: serverTimestamp()
        });
      }

      // 2. Handle Awarding Points for the cash part
      if (shouldAwardNow) {
        const userRef = doc(db, 'users', user!.uid);
        batch.update(userRef, {
          namatePoints: increment(coinsToAward)
        });

        const pointsEarnRef = doc(collection(db, 'users', user!.uid, 'points_history'));
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
      toast.error("Failed to save order. Please contact support.");
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
    <div className="bg-background min-h-screen pt-20 pb-40">
      <div className="px-6 py-4 max-w-7xl mx-auto">
        {/* Cart Items List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div 
                key={item.id + (item.size || '')} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex gap-4"
              >
                <Link 
                  to={`/product/${item.id}`}
                  onClick={() => triggerHaptic('light')}
                  className="w-24 aspect-[4/5] rounded-2xl overflow-hidden flex-shrink-0 bg-transparent group/img relative"
                >
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain transition-transform group-hover/img:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors" />
                </Link>
                <div className="flex-grow flex flex-col py-1">
                  <div className="flex justify-between items-start mb-1">
                    <Link 
                      to={`/product/${item.id}`}
                      onClick={() => triggerHaptic('light')}
                      className="group/name flex-grow pr-4"
                    >
                      <h3 className="text-sm font-bold text-black leading-tight line-clamp-1 group-hover/name:text-[#C5A059] transition-colors">{item.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover/name:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#C5A059]">View Details</span>
                        <ChevronRight className="w-2 h-2 text-[#C5A059]" />
                      </div>
                    </Link>
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
                          triggerHaptic('light');
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
                        onClick={() => {
                          triggerHaptic('light');
                          updateQuantity(item.id, item.size, 1);
                        }}
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

        {/* Shipping Form */}
        <div id="shipping-form" className="mt-12 p-8 bg-black/5 rounded-[40px] border border-black/5 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-black rounded-xl">
                < ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-black">Shipping Details</h2>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">Where should we send your order?</p>
                  {isLocationAutofilled && shippingDetails.lat && shippingDetails.lng && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-full font-mono text-[9px] font-bold animate-in fade-in slide-in-from-left-2 duration-500">
                      <MapPin className="w-2.5 h-2.5" />
                      {shippingDetails.lat.toFixed(4)}°, {shippingDetails.lng.toFixed(4)}°
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  useCurrentLocation();
                }}
                disabled={fetchingLocation}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black border border-black/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                {fetchingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                {fetchingLocation ? "Getting Location..." : "Use My Location"}
              </button>

              {isLocationAutofilled && (
                <button 
                  onClick={() => {
                    setIsLocationAutofilled(false);
                    setShippingDetails(prev => ({ ...prev, lat: null, lng: null }));
                  }}
                  className="px-4 py-3 bg-red-50 text-red-500 border border-red-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Edit Manually
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Receiver's Name *</label>
                <input 
                  type="text" 
                  value={shippingDetails.receiverName}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, receiverName: e.target.value }))}
                  placeholder="Full Name"
                  className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Mobile Number *</label>
                <input 
                  type="tel" 
                  maxLength={10}
                  value={shippingDetails.mobileNumber}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                  placeholder="10-digit number"
                  className="w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Pincode *</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={shippingDetails.pincode}
                  readOnly={isLocationAutofilled}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setShippingDetails(prev => ({ ...prev, pincode: val }));
                    if (val.length === 6) fetchCityStateByPincode(val);
                  }}
                  placeholder="6-digit pincode"
                  className={cn(
                    "w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black",
                    isLocationAutofilled && "bg-black/[0.02] text-black/40 cursor-not-allowed"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Street / Area *</label>
                <input 
                  type="text" 
                  value={shippingDetails.street}
                  readOnly={isLocationAutofilled}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, street: e.target.value }))}
                  placeholder="Street name, building, apartment"
                  className={cn(
                    "w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black",
                    isLocationAutofilled && "bg-black/[0.02] text-black/40 cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">Landmark (Nearby)</label>
                <input 
                  type="text" 
                  value={shippingDetails.landmark}
                  readOnly={isLocationAutofilled}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, landmark: e.target.value }))}
                  placeholder="E.g. Near Central Mall"
                  className={cn(
                    "w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black",
                    isLocationAutofilled && "bg-black/[0.02] text-black/40 cursor-not-allowed"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">City</label>
                <input 
                  type="text" 
                  value={shippingDetails.city}
                  readOnly={isLocationAutofilled}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className={cn(
                    "w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black",
                    isLocationAutofilled && "bg-black/[0.02] text-black/40 cursor-not-allowed"
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/60 ml-4">State</label>
                <input 
                  type="text" 
                  value={shippingDetails.state}
                  readOnly={isLocationAutofilled}
                  onChange={(e) => setShippingDetails(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className={cn(
                    "w-full h-14 bg-white border border-black/5 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-black",
                    isLocationAutofilled && "bg-black/[0.02] text-black/40 cursor-not-allowed"
                  )}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 px-4">
            <button 
              onClick={() => setSaveAddress(!saveAddress)}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                saveAddress ? "bg-black" : "bg-black/20"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm",
                saveAddress ? "right-0.5" : "left-0.5"
              )} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/60">Save this address for next time</span>
          </div>
        </div>

        {/* Summary Info */}
        <div className="mt-10 space-y-4">
          <div className="bg-black/5 rounded-[32px] p-6 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-black/40">Select Payment Frequency</p>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setPaymentMethod('online');
                  triggerHaptic('light');
                }}
                className={cn(
                  "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                  paymentMethod === 'online' ? "bg-black text-white border-black" : "bg-white text-black border-black/5"
                )}
              >
                Online Pay
              </button>
              <button 
                onClick={() => {
                  setPaymentMethod('cod');
                  triggerHaptic('light');
                }}
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
