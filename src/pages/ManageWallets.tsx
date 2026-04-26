import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  Wallet, 
  Plus, 
  Loader2, 
  User as UserIcon, 
  ArrowRight,
  TrendingUp,
  History,
  ShieldCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  serverTimestamp,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import BrandSignature from '@/components/BrandSignature';
import { cn } from '@/lib/utils';

export default function ManageWallets() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';

  const [users, setUsers] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [creditType, setCreditType] = useState<'wallet' | 'points'>('wallet');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('Admin Adjustment');

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/profile');
      return;
    }

    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setIsFetching(false);
      }
    };

    fetchUsers();
  }, [isAdmin, loading, navigate]);

  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount || isNaN(Number(creditAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    const amount = Number(creditAmount);
    const label = creditType === 'wallet' ? 'Credits' : 'Points';
    const toastId = toast.loading(`Funding ${label} for ${selectedUser.displayName || 'member'}...`);

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      
      if (creditType === 'wallet') {
        const transRef = collection(db, 'users', selectedUser.id, 'transactions');
        // Update balance
        await updateDoc(userRef, {
          walletBalance: increment(amount)
        });
        // Record transaction
        await addDoc(transRef, {
          amount,
          type: 'credit',
          description: creditReason,
          createdAt: serverTimestamp(),
          adminAction: true,
          adminId: user?.uid
        });
      } else {
        const transRef = collection(db, 'users', selectedUser.id, 'points_history');
        // Update points
        await updateDoc(userRef, {
          namatePoints: increment(amount)
        });
        // Record transaction
        await addDoc(transRef, {
          points: amount,
          type: 'earn',
          description: creditReason,
          createdAt: serverTimestamp(),
          adminAction: true,
          adminId: user?.uid
        });
      }

      toast.success(`${amount} ${label} added successfully!`, { id: toastId });
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { 
              ...u, 
              walletBalance: creditType === 'wallet' ? (u.walletBalance || 0) + amount : u.walletBalance,
              namatePoints: creditType === 'points' ? (u.namatePoints || 0) + amount : u.namatePoints
            } 
          : u
      ));

      setSelectedUser(null);
      setCreditAmount('');
      setCreditReason('Admin Adjustment');
    } catch (error) {
      console.error("Credit error:", error);
      toast.error(`Failed to add ${label}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black">Fund Wallets</h1>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-1">Admin Treasury</p>
            </div>
          </div>
        </div>

        {/* Global Treasury Stat */}
        <div className="bg-black text-white rounded-[40px] p-8 mb-12 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C5A059] mb-2 block">Brand Treasury</span>
              <h2 className="text-4xl font-brand font-medium tracking-tighter">Namate Credits</h2>
              <p className="text-white/40 text-xs font-bold mt-2 uppercase tracking-widest">Global wallet administration</p>
            </div>
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shrink-0">
              <ShieldCheck className="w-10 h-10 text-[#C5A059]" />
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-[#C5A059]/10 rounded-full blur-3xl" />
        </div>

        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tribe members by name or email..."
            className="h-16 pl-14 pr-8 rounded-full border-2 border-black/5 bg-black/5 focus:bg-white focus:border-black transition-all font-bold text-black"
          />
        </div>

        {/* Users List */}
        <div className="space-y-4">
          <div className="px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-black/20 mb-2">
            <span>Tribe Member</span>
            <div className="flex gap-12 sm:gap-24">
              <span>Wallet</span>
              <span>Points</span>
            </div>
          </div>
          
          {filteredUsers.map((u) => (
            <div 
              key={u.id}
              className="bg-white border-2 border-black/5 rounded-[32px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-black/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black/5 overflow-hidden flex items-center justify-center shrink-0">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-black/20" />
                  )}
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tight text-black">{u.displayName || 'Tribe Member'}</h3>
                  <p className="text-[10px] font-bold text-black/40">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-12 sm:gap-16">
                <div className="flex gap-12 sm:gap-16">
                  <div className="text-right">
                    <p className="text-xl font-brand font-medium tracking-tighter text-black">₹{u.walletBalance || 0}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-black/20">Wallet</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-brand font-medium tracking-tighter text-[#C5A059]">{u.namatePoints || 0}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-[#C5A059]/40">Points</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(u)}
                  className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center hover:bg-black/80 transition-all shadow-xl shadow-black/10 group-hover:scale-105"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center opacity-20">
              <UserIcon className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-[10px]">No members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Credit Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[48px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-black">Add Credits</h2>
                    <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">Fund {selectedUser.displayName || 'Member'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Funding Type</Label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCreditType('wallet')}
                      className={cn(
                        "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                        creditType === 'wallet' ? "bg-black text-white border-black" : "bg-white text-black border-black/5"
                      )}
                    >
                      Wallet Credit
                    </button>
                    <button 
                      onClick={() => setCreditType('points')}
                      className={cn(
                        "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2",
                        creditType === 'points' ? "bg-black text-white border-black" : "bg-white text-black border-black/5"
                      )}
                    >
                      Namate Points
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">
                    {creditType === 'wallet' ? 'Credit Amount (₹)' : 'Points Amount'}
                  </Label>
                  <Input 
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder={creditType === 'wallet' ? "e.g. 500" : "e.g. 1000"}
                    className="h-16 rounded-3xl border-2 border-black/5 bg-black/5 focus:bg-white focus:border-black transition-all font-bold text-2xl px-6"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-black/40 ml-2">Reason / Description</Label>
                  <Input 
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. Loyalty Reward"
                    className="h-14 rounded-2xl border-2 border-black/5 bg-black/5 focus:bg-white focus:border-black transition-all font-bold px-6"
                  />
                </div>

                <Button 
                  onClick={handleAddCredits}
                  disabled={isProcessing}
                  className="w-full h-20 bg-black text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-black/90 transition-all shadow-2xl shadow-black/20 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <TrendingUp className="w-6 h-6" />
                      CONFIRM FUNDING
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BrandSignature variant="dark" className="opacity-20 mt-12" />
    </div>
  );
}
