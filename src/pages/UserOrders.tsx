import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle,
  ChevronRight,
  Package,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Palmtree
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '@/lib/haptics';
import BrandSignature from '@/components/BrandSignature';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase';
import { Banknote, Sparkles } from 'lucide-react';

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

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'return_requested' | 'returned' | 'cancelled';
  paymentMethod: 'online' | 'cod';
  pointsAwarded: boolean;
  createdAt: Timestamp;
  returnRequest?: {
    reason: string;
    type: 'refund' | 'exchange';
    targetSize?: string | null;
    requestedAt: any;
    status: string;
  };
}

export default function UserOrders() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem('user_orders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('user_orders_cache');
      return !cached;
    } catch {
      return true;
    }
  });

  // Return & Exchange states
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('Size mismatch - too small');
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund');
  const [targetSize, setTargetSize] = useState('M');
  const [returnStep, setReturnStep] = useState<'form' | 'success'>('form');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Tracking modal state
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);

  const handleReturnSubmit = async () => {
    if (!returnOrder) return;
    setIsSubmittingReturn(true);
    try {
      const orderRef = doc(db, 'orders', returnOrder.id);
      await updateDoc(orderRef, {
        status: 'return_requested',
        returnRequest: {
          reason: returnReason,
          type: returnType,
          targetSize: returnType === 'exchange' ? targetSize : null,
          requestedAt: new Date(),
          status: 'pending'
        }
      });
      toast.success("Return / Exchange request submitted!");
      setReturnStep('success');
    } catch (e) {
      console.error("Return error: ", e);
      toast.error("Failed to submit return request");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      try {
        localStorage.setItem('user_orders_cache', JSON.stringify(ordersData.slice(0, 10)));
      } catch (cErr) {
        console.warn("Could not save user orders in cache:", cErr);
      }
      setIsInitialLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/20 text-yellow-500 border-yellow-900/30';
      case 'processing': return 'bg-blue-900/20 text-blue-400 border-blue-900/30';
      case 'shipped': return 'bg-purple-900/20 text-purple-400 border-purple-900/30';
      case 'delivered': return 'bg-green-900/20 text-green-400 border-green-900/30';
      case 'return_requested': return 'bg-amber-950 text-[#C5A059] border-amber-900/30';
      case 'returned': return 'bg-neutral-800 text-neutral-400 border-neutral-700/50';
      case 'cancelled': return 'bg-red-900/20 text-red-500 border-red-900/30';
      default: return 'bg-white/10 text-white/40 border-white/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'processing': return <Package className="w-3 h-3" />;
      case 'shipped': return <Truck className="w-3 h-3" />;
      case 'delivered': return <CheckCircle2 className="w-3 h-3" />;
      case 'return_requested': return <RotateCcw className="w-3 h-3 text-[#C5A059] animate-spin-slow" />;
      case 'returned': return <CheckCircle2 className="w-3 h-3 text-neutral-400" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  if (loading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#011c16] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <ShoppingBag className="w-16 h-16 text-white/10 mb-6" />
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-4">Please Login</h1>
        <p className="text-white/40 font-medium text-center mb-10">You need to be logged in to view your orders.</p>
        <Button onClick={() => navigate('/profile')} className="bg-white text-black font-black px-10 py-6 rounded-full">GO TO PROFILE</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-32">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order.id} className="bg-white/5 border-2 border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 transition-all group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Order #{order.id.slice(-8)}</p>
                      <p className="text-xs font-bold text-white/30">{format(order.createdAt.toDate(), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5", 
                        order.paymentMethod === 'online' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-black/10 text-black/40 border-black/10"
                      )}>
                        {order.paymentMethod === 'online' ? <CheckCircle2 className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        {order.paymentMethod === 'online' ? 'Online Paid' : 'COD'}
                      </Badge>
                      <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5", getStatusColor(order.status))}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                      {order.pointsAwarded && (
                        <Badge className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Coins Awarded
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow py-1">
                          <h3 className="text-sm font-black uppercase tracking-tight line-clamp-1">{item.name}</h3>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{item.size} • Qty: {item.quantity}</p>
                          <p className="text-sm font-black">₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-white/5 pb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Total Paid</span>
                    <span className="text-xl font-black">₹{order.total}</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedTrackingOrder(order);
                        triggerHaptic('light');
                      }}
                      className="flex-1 bg-white hover:bg-neutral-200 text-black font-black text-[10px] uppercase tracking-widest h-11 rounded-2xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      Track Order
                    </button>

                    {order.status === 'delivered' && (
                      <button
                        onClick={() => {
                          setReturnOrder(order);
                          setReturnReason('Size mismatch - too small');
                          setReturnType('refund');
                          setReturnStep('form');
                          setTargetSize(order.items[0]?.size || 'M');
                        }}
                        className="flex-1 bg-[#C5A059] hover:bg-[#d5b36e] text-black font-black text-[10px] uppercase tracking-widest h-11 rounded-2xl flex items-center justify-center gap-2 transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Easy Return & Exchange
                      </button>
                    )}
                  </div>

                  {order.status === 'return_requested' && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 rounded-2xl p-4 flex items-start gap-3">
                        <RotateCcw className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin-slow" style={{ animationDuration: '6s' }} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059] mb-1">Return Requested</p>
                          <p className="text-[10px] font-semibold text-white/70 leading-normal">
                            Reason: {order.returnRequest?.reason || 'Size doesn\'t fit'} <br />
                            Type: {order.returnRequest?.type === 'refund' ? 'Tribe Wallet Refund' : `Size Exchange (${order.returnRequest?.targetSize})`}
                          </p>
                          <p className="text-[9px] text-[#C5A059]/80 font-bold uppercase tracking-widest mt-2">
                            • Status: Pending pickup (within 24-48 hours)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.status === 'returned' && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Returned & Approved</p>
                          <p className="text-[10px] font-medium text-white/40 leading-normal">
                            This return has been collected and successfully processed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-[40px] border-2 border-dashed border-white/10">
            <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">No orders yet</h3>
            <p className="text-white/40 font-bold text-sm mb-8">Start shopping to see your orders here.</p>
            <Button onClick={() => navigate('/shop')} className="bg-white text-black font-black px-8 py-4 rounded-full">SHOP NOW</Button>
          </div>
        )}
      </div>
      <BrandSignature variant="dark" className="mb-20 opacity-20" />

      {/* Dynamic Easy Return & Exchange Modal Overlay */}
      {returnOrder && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111] border-2 border-white/5 text-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative my-auto">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
              <div>
                <h3 className="text-sm font-brand font-black uppercase tracking-widest text-[#C5A059] mb-1">Easy Return & Exchange</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Order #{returnOrder.id.slice(-8)}</p>
              </div>
              <button 
                onClick={() => setReturnOrder(null)} 
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {returnStep === 'form' ? (
              <div className="p-6 space-y-6">
                
                {/* Products Summary */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Items to Return</p>
                  {returnOrder.items.map((item, index) => (
                    <div key={index} className="flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="w-12 h-14 bg-white/10 rounded-lg overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-tight line-clamp-1">{item.name}</h4>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{item.size || 'Standard'} • Qty {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Return Type Selection */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Return Action</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReturnType('refund')}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24",
                        returnType === 'refund' 
                          ? "border-[#C5A059] bg-[#C5A059]/5 text-white" 
                          : "border-white/5 bg-white/2 text-white/60 hover:border-white/10"
                      )}
                    >
                      <RotateCcw className={cn("w-5 h-5", returnType === 'refund' ? "text-[#C5A059]" : "text-white/40")} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Tribe Refund</p>
                        <p className="text-[8px] mt-0.5 text-white/40">Wallet credit (Instant!)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnType('exchange')}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24",
                        returnType === 'exchange' 
                          ? "border-[#C5A059] bg-[#C5A059]/5 text-white" 
                          : "border-white/5 bg-white/2 text-white/60 hover:border-white/10"
                      )}
                    >
                      <RefreshCw className={cn("w-5 h-5", returnType === 'exchange' ? "text-[#C5A059]" : "text-white/40")} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Size Exchange</p>
                        <p className="text-[8px] mt-0.5 text-white/40">Request a swap size</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* If Size Exchange selected, show custom options */}
                {returnType === 'exchange' && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Requested Size</p>
                    <div className="flex gap-2">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setTargetSize(sz)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all",
                            targetSize === sz 
                              ? "bg-white text-black" 
                              : "bg-white/5 hover:bg-white/15 border border-white/5 text-white"
                          )}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Return Reason Option */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Reason for Return</p>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl px-4 text-xs font-bold text-white/80 focus:outline-none focus:border-[#C5A059] transition-all"
                  >
                    <option value="Size mismatch - too small">Size doesn't fit (Too small)</option>
                    <option value="Size mismatch - too big">Size doesn't fit (Too big)</option>
                    <option value="Item damaged or defective">Item damaged or defective</option>
                    <option value="Incorrect item received">Incorrect item received</option>
                    <option value="Product quality not as expected">Product quality not as expected</option>
                    <option value="Changed mind - No longer needed">Changed mind / No longer needed</option>
                  </select>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  disabled={isSubmittingReturn}
                  onClick={handleReturnSubmit}
                  className="w-full h-14 bg-[#C5A059] hover:bg-[#d5b36e] text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmittingReturn ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      Submit Request
                    </>
                  )}
                </button>

              </div>
            ) : (
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto border border-[#C5A059]/20">
                  <Check className="w-8 h-8 text-[#C5A059]" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter text-white mb-2">Request Lodged!</h3>
                  <p className="text-white/60 text-xs leading-relaxed max-w-xs mx-auto">
                    Your {returnType === 'refund' ? "return & refund" : "exchange size"} request of Order #{returnOrder.id.slice(-8)} has been logged successfully.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-3xl text-left border border-white/5 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Next Steps</p>
                  <div className="flex gap-3 text-[10px] leading-relaxed">
                    <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-black flex-shrink-0 text-[#C5A059]">1</span>
                    <p className="text-white/80">Keep items ready along with original tags in proper packing.</p>
                  </div>
                  <div className="flex gap-3 text-[10px] leading-relaxed">
                    <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-black flex-shrink-0 text-[#C5A059]">2</span>
                    <p className="text-white/80">Our pickup executive will inspect and collect the package within 24-48 hours.</p>
                  </div>
                  <div className="flex gap-3 text-[10px] leading-relaxed">
                    <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center font-black flex-shrink-0 text-[#C5A059]">3</span>
                    <p className="text-white/80">{returnType === 'refund' ? 'Tribe Wallet refund credit will be instantly posted upon pickup!' : 'Your exchange dress will be dispatched immediately.'}</p>
                  </div>
                </div>

                <Button
                  onClick={() => setReturnOrder(null)}
                  className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl"
                >
                  Close Window
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Absolute beautifully custom tracking sheet overlay */}
      <AnimatePresence>
        {selectedTrackingOrder && (() => {
          const order = selectedTrackingOrder;
          const orderDate = order.createdAt.toDate();
          
          const getFormattedOffsetDate = (daysOffset: number) => {
            const d = new Date(orderDate);
            d.setDate(d.getDate() + daysOffset);
            return format(d, 'MMM dd, yyyy');
          };

          // Status & Headline logic mapping based on image:
          let headline = "Your piece is being crafted.";
          let subtitle = "We'll notify you when it's on the way.";
          let activeIndex = 1; // Default to crafting/processing

          if (order.status === 'pending') {
            headline = "Your piece is confirmed.";
            subtitle = "Starting our high-end crafting process shortly.";
            activeIndex = 0;
          } else if (order.status === 'processing') {
            headline = "Your piece is being crafted.";
            subtitle = "We'll notify you when it's on the way.";
            activeIndex = 1;
          } else if (order.status === 'shipped') {
            headline = "Your piece has been dispatched.";
            subtitle = "It is moving elegantly to your doorstep.";
            activeIndex = 3;
          } else if (order.status === 'delivered') {
            headline = "Your piece has been delivered.";
            subtitle = "Enjoy your high-end crafted attire.";
            activeIndex = 4;
          } else if (order.status === 'cancelled') {
            headline = "This order was cancelled.";
            subtitle = "The reservation has been voided.";
            activeIndex = 0;
          } else if (order.status === 'return_requested' || order.status === 'returned') {
            headline = "Return/Exchange in progress.";
            subtitle = "We are managing your reverse collection.";
            activeIndex = 2;
          }

          // Let's create an elegant, responsive svg path matching the luxurious arc from the photo
          const points = [
            { x: 30, y: 55, active: activeIndex >= 0 },
            { x: 92.5, y: 32, active: activeIndex >= 1 },
            { x: 155, y: 20, active: activeIndex >= 2 }, // peak
            { x: 217.5, y: 32, active: activeIndex >= 3 },
            { x: 280, y: 55, active: activeIndex >= 4 },
          ];

          // Map points for active SVG representation path
          let activePathD = "";
          if (activeIndex === 0) {
            activePathD = "M 30 55 L 30 55";
          } else if (activeIndex === 1) {
            activePathD = "M 30 55 Q 92.5 32 92.5 32";
          } else if (activeIndex === 2) {
            activePathD = "M 30 55 Q 92.5 32 155 20";
          } else if (activeIndex === 3) {
            activePathD = "M 30 55 Q 155 12 217.5 32";
          } else if (activeIndex >= 4) {
            activePathD = "M 30 55 Q 155 12 280 55";
          }

          const stepsList = [
            { label: "Order Confirmed", date: getFormattedOffsetDate(0), completed: activeIndex >= 0, current: activeIndex === 0 },
            { label: "Being Crafted", date: getFormattedOffsetDate(1), completed: activeIndex >= 1, current: activeIndex === 1 },
            { label: "Packed & Prepared", date: getFormattedOffsetDate(3), completed: activeIndex >= 2, current: activeIndex === 2 },
            { label: "Out for Delivery", date: getFormattedOffsetDate(5), completed: activeIndex >= 3, current: activeIndex === 3 },
            { label: "Delivered", date: getFormattedOffsetDate(7), completed: activeIndex >= 4, current: activeIndex === 4 },
          ];

          return (
            <motion.div 
              className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0" onClick={() => setSelectedTrackingOrder(null)} />
              
              <motion.div 
                className="bg-[#F7F4F0] text-black w-full max-w-md h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col z-10"
                initial={{ y: "100%", opacity: 0.5 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0.5 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
              >
                {/* Custom Elegant Header */}
                <div className="pt-8 px-6 pb-4 flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedTrackingOrder(null)}
                    className="w-10 h-10 rounded-full border border-black/5 bg-white flex items-center justify-center active:scale-90 hover:bg-neutral-100 transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-black" />
                  </button>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-800">Order Tracking</h3>
                  <div className="w-10 h-10" /> {/* Spacer */}
                </div>

                {/* Subheader tracking number */}
                <div className="px-6 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-black/5 text-[8px] font-black uppercase tracking-wider text-black/50">
                    ID: #{order.id.slice(-12).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 space-y-6">
                  {/* Headline & Sub-headline */}
                  <div className="text-center space-y-2 max-w-xs mx-auto">
                    <h2 className="text-2xl font-black tracking-tight text-neutral-900 font-brand">
                      {headline}
                    </h2>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider leading-relaxed">
                      {subtitle}
                    </p>
                  </div>

                  {/* Elegant Graphic Area with Curve Arc and Palm Tree Symbol */}
                  <div className="relative h-32 flex flex-col justify-end items-center mb-4">
                    {/* SVG Curve */}
                    <div className="absolute inset-x-0 top-0 h-full flex items-center justify-center">
                      <svg width="310" height="90" viewBox="0 0 310 90" className="opacity-90">
                        {/* Underlay passive light line */}
                        <path 
                          d="M 30 65 Q 155 15 280 65" 
                          fill="none" 
                          stroke="#EBE5DC" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                        {/* Overlay active dynamic dark line */}
                        {activePathD && (
                          <motion.path 
                            d={activePathD} 
                            fill="none" 
                            stroke="#111" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        )}

                        {/* Plotted Dots on arc as small double rings */}
                        {points.map((pt, i) => (
                          <g key={i}>
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r="5" 
                              fill={pt.active ? "#111" : "#FAF9F6"} 
                              stroke={pt.active ? "#111" : "#D0C9BE"} 
                              strokeWidth="1.5" 
                            />
                            {pt.active && (
                              <circle 
                                cx={pt.x} 
                                cy={pt.y} 
                                r="2.5" 
                                fill="#fff" 
                              />
                            )}
                          </g>
                        ))}
                      </svg>
                    </div>

                    {/* Highly polished Palm Tree centered silhouette perfectly matched to image */}
                    <div className="absolute bottom-1 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#EFEBE4] flex items-center justify-center shadow-inner border border-black/[0.03]">
                        <Palmtree className="w-6 h-6 text-black stroke-[1.5]" />
                      </div>
                    </div>
                  </div>

                  {/* Vertical Timeline List perfectly matching design */}
                  <div className="space-y-6 max-w-sm mx-auto px-4 relative mt-10">
                    {/* Vertical connecting line background */}
                    <div className="absolute left-[29px] top-3 bottom-3 w-[1.5px] bg-[#E4DFD6]" />

                    {/* Timeline dynamic highlight */}
                    <div 
                      className="absolute left-[29px] top-3 w-[1.5px] bg-black transition-all duration-1000" 
                      style={{ 
                        height: `${
                          activeIndex === 4 ? '100%' :
                          activeIndex === 3 ? '75%' :
                          activeIndex === 2 ? '50%' :
                          activeIndex === 1 ? '25%' : '0%'
                        }`
                      }} 
                    />

                    {stepsList.map((step, idx) => {
                      const isActive = step.completed || step.current;
                      return (
                        <div key={idx} className="flex items-center gap-5 relative z-10">
                          {/* Timeline Circle with concentric ring styles */}
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-[#F7F4F0]",
                            step.completed ? "border-black bg-black" : step.current ? "border-black scale-105" : "border-[#D0C9BE]"
                          )}>
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full transition-all duration-300",
                              step.completed ? "bg-white" : step.current ? "bg-black animate-pulse" : "bg-transparent"
                            )} />
                          </div>

                          {/* Content Row */}
                          <div className="flex-1 flex justify-between items-center py-1.5 border-b border-black/[0.04]">
                            <span className={cn(
                              "text-[11px] font-black uppercase tracking-wider",
                              isActive ? "text-neutral-900" : "text-neutral-400"
                            )}>
                              {step.label}
                            </span>
                            <span className={cn(
                              "text-[9.5px] font-bold uppercase tracking-wider text-black/40"
                            )}>
                              {step.date}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sandy soft Estimated Delivery bottom frame */}
                  <div className="max-w-sm mx-auto mt-10">
                    <div className="bg-[#EAE4D9]/80 border border-black/[0.03] p-5 rounded-2xl text-center shadow-sm space-y-1">
                      <span className="block text-[8.5px] text-black/40 font-black uppercase tracking-[0.3em]">
                        Estimated Delivery
                      </span>
                      <span className="block text-base font-black uppercase tracking-[0.15em] text-neutral-800">
                        {getFormattedOffsetDate(9)} - {getFormattedOffsetDate(14)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Return window closer */}
                <div className="p-6 bg-[#EFEBE4] border-t border-black/5">
                  <button
                    onClick={() => setSelectedTrackingOrder(null)}
                    className="w-full bg-black hover:bg-neutral-800 text-white font-black uppercase tracking-widest text-xs h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
