import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Trash2, 
  Search, 
  Filter, 
  Plus,
  AlertCircle,
  Package,
  ExternalLink,
  Crown,
  Loader2
} from 'lucide-react';
import BrandSignature from '@/components/BrandSignature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ManageProducts() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(0)
        };
      });
      
      // Sort client-side
      firestoreProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setProducts(firestoreProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleDelete = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(productId);
    try {
      // Find the product data first
      const productToDelete = products.find(p => p.id === productId);
      
      if (productToDelete) {
        // Store in deleted_products collection before deleting
        await setDoc(doc(db, 'deleted_products', productId), {
          ...productToDelete,
          deletedAt: serverTimestamp(),
          deletedBy: user?.email || 'unknown'
        });
      }

      await deleteDoc(doc(db, 'products', productId));
      toast.success(`"${productName}" deleted successfully`);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete product");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleTogglePremium = async (productId: string, currentStatus: boolean) => {
    setIsPromoting(productId);
    try {
      await updateDoc(doc(db, 'products', productId), {
        isPremium: !currentStatus
      });
      toast.success(currentStatus ? "Removed from Regal collection" : "Promoted to Regal collection");
    } catch (error: any) {
      console.error("Promotion error:", error);
      toast.error("Failed to update product status");
    } finally {
      setIsPromoting(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || (isAdmin && isLoading)) {
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
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center">Access Denied</h1>
        <p className="text-white/40 font-medium text-center mb-10 max-w-xs">
          You do not have permission to manage products.
        </p>
        <Button 
          onClick={() => navigate('/')}
          className="w-full max-w-xs h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-[#011c16] transition-all"
        >
          BACK TO HOME
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tighter">Manage Inventory</h1>
        </div>
        <Link to="/add-product">
          <Button size="sm" className="bg-black text-white rounded-full font-black uppercase text-[10px] tracking-widest px-4">
            <Plus className="w-3.5 h-3.5 mr-2" />
            ADD NEW
          </Button>
        </Link>
      </div>

      {/* Search & Stats */}
      <div className="px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <Input 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-white/5 focus:border-white/20 transition-all font-bold bg-white/5"
            />
          </div>
          
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#011c16]" />
              <span className="text-xs font-black uppercase tracking-widest text-white/40">
                {products.length} Total Products
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="px-4 space-y-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="bg-white/5 rounded-3xl border-2 border-white/5 p-4 flex items-center gap-4 group hover:border-white/20 transition-all"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#011c16] bg-[#011c16]/10 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight truncate mb-1">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white/40">₹{product.price}</p>
                  {product.isPremium && (
                    <div className="flex items-center gap-1 bg-[#011c16]/10 px-2 py-0.5 rounded-full">
                      <Crown className="w-2.5 h-2.5 text-[#C5A059]" />
                      <span className="text-[8px] font-black uppercase tracking-widest luxury-text-gradient">Regal</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link 
                  to={`/product/${product.id}`}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button 
                  onClick={() => handleTogglePremium(product.id, product.isPremium)}
                  disabled={isPromoting === product.id}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50",
                    product.isPremium 
                      ? "bg-[#011c16] text-white shadow-[0_0_15px_rgba(1,28,22,0.4)]" 
                      : "bg-white/5 text-white/40 hover:bg-[#011c16]/10 hover:text-[#011c16]"
                  )}
                  title={product.isPremium ? "Remove from Regal" : "Promote to Regal"}
                >
                  {isPromoting === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                </button>
                <button 
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={isDeleting === product.id}
                  className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                >
                  {isDeleting === product.id ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tighter mb-2">No products found</h3>
            <p className="text-white/40 text-sm font-bold">Try a different search or add a new product.</p>
          </div>
        )}
      </div>
      <BrandSignature variant="dark" className="mb-20 opacity-20" />
    </div>
  );
}
