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
  Package
} from 'lucide-react';
import BrandSignature from '@/components/BrandSignature';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { auth } from '@/lib/firebase';

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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Timestamp;
}

export default function UserOrders() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter">My Orders</h1>
        </div>
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
                    <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5", getStatusColor(order.status))}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
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

                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Total Paid</span>
                    <span className="text-xl font-black">₹{order.total}</span>
                  </div>
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
    </div>
  );
}
