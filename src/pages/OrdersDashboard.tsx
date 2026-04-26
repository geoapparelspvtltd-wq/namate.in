import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle,
  ChevronRight,
  Filter,
  User as UserIcon,
  ShoppingBag
} from 'lucide-react';
import AlternatingSearchIcon from '@/components/AlternatingSearchIcon';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  Timestamp,
  writeBatch,
  increment,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { Sparkles, Banknote } from 'lucide-react';

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
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'online' | 'cod';
  paymentStatus: 'paid' | 'unpaid';
  pointsAwarded: boolean;
  createdAt: Timestamp;
}

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setIsInitialLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [role]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data() as Order;

      if (newStatus === 'delivered' && !orderData.pointsAwarded) {
        const batch = writeBatch(db);
        const coinsToAward = Math.floor(orderData.total / 1000) * 100;

        // 1. Update Order Status
        batch.update(orderRef, { 
          status: 'delivered',
          paymentStatus: 'paid', // Assuming delivery means paid for COD
          pointsAwarded: true 
        });

        if (coinsToAward > 0) {
          // 2. Award Points
          const userRef = doc(db, 'users', orderData.userId);
          batch.update(userRef, {
            namatePoints: increment(coinsToAward)
          });

          // 3. Record Point Transaction
          const pointsHistoryRef = doc(collection(db, 'users', orderData.userId, 'points_history'));
          batch.set(pointsHistoryRef, {
            points: coinsToAward,
            type: 'earn',
            description: `Delivery reward (Order: ${orderId.slice(-6)})`,
            createdAt: serverTimestamp()
          });
        }

        await batch.commit();
        toast.success(`Order delivered! ${coinsToAward} Namate coins awarded to customer.`);
      } else {
        await updateDoc(orderRef, { status: newStatus });
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/20 text-yellow-500 border-yellow-900/30';
      case 'processing': return 'bg-blue-900/20 text-blue-400 border-blue-900/30';
      case 'shipped': return 'bg-purple-900/20 text-purple-400 border-purple-900/30';
      case 'delivered': return 'bg-green-900/20 text-green-400 border-green-900/30';
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
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading || isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#011c16] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-8">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center">Access Denied</h1>
        <p className="text-white/40 font-medium text-center mb-10 max-w-xs">
          Only admins can access the orders dashboard.
        </p>
        <Button onClick={() => navigate('/')} className="w-full max-w-xs h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest">
          BACK TO HOME
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter">Order Management</h1>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Orders</p>
            <p className="text-2xl font-black text-white">{orders.length}</p>
          </div>
          <div className="p-6 bg-yellow-900/20 rounded-3xl border border-yellow-900/30">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1">Pending</p>
            <p className="text-2xl font-black text-yellow-500">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="p-6 bg-blue-900/20 rounded-3xl border border-blue-900/30">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Processing</p>
            <p className="text-2xl font-black text-blue-400">{orders.filter(o => o.status === 'processing').length}</p>
          </div>
          <div className="p-6 bg-green-900/20 rounded-3xl border border-green-900/30">
            <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">Delivered</p>
            <p className="text-2xl font-black text-green-400">{orders.filter(o => o.status === 'delivered').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <AlternatingSearchIcon />
            </div>
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Email or Name..."
              className="pl-16 h-14 rounded-2xl border-2 border-white/5 focus:border-white/20 transition-all font-bold bg-white/5"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-6 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex-shrink-0",
                  statusFilter === status 
                    ? "bg-white text-black border-white" 
                    : "bg-white/5 border-white/5 text-white/40 hover:border-white/20"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-white/5 border-2 border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 transition-all group">
                {/* Order Header */}
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-white/20" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Order</span>
                        <span className="text-xs font-black uppercase tracking-tight">#{order.id.slice(-8)}</span>
                      </div>
                      <p className="text-[10px] font-bold text-white/40">{format(order.createdAt.toDate(), 'MMM dd, yyyy • HH:mm')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
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
                    <div className="h-8 w-[1px] bg-white/10 mx-2 hidden sm:block" />
                    <span className="text-xl font-black">₹{order.total}</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="px-6 py-4 bg-white/5 flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
                    <UserIcon className="w-4 h-4 text-white/20" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="text-xs font-black uppercase tracking-tight">{order.userName || 'Anonymous'}</span>
                    <span className="text-[10px] font-bold text-white/40">{order.userEmail}</span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="p-6">
                  <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex-shrink-0 flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="pr-2">
                          <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1 max-w-[100px]">{item.name}</p>
                          <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{item.size} • Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mr-2 self-center">Update Status:</span>
                  {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(order.id, status)}
                      disabled={order.status === status}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                        order.status === status 
                          ? "bg-white text-black border-white" 
                          : "bg-white/5 text-white/40 border-white/10 hover:border-white hover:text-white"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[40px] border-2 border-dashed border-white/10">
              <ShoppingBag className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">No orders found</h3>
              <p className="text-white/40 font-bold text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
