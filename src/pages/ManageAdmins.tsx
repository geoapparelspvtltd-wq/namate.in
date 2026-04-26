import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  UserPlus, 
  Shield, 
  ShieldAlert,
  User as UserIcon,
  X
} from 'lucide-react';
import BrandSignature from '@/components/BrandSignature';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
}

export default function ManageAdmins() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || user?.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com';
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  const isPrimaryAdmin = user?.email === 'geoapparelspvtltd@gmail.com';

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        adminList.push(doc.data() as UserProfile);
      });
      setAdmins(adminList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', searchEmail.trim().toLowerCase()),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      const results: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as UserProfile);
      });
      setSearchResults(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleAdminRole = async (targetUser: UserProfile) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    
    // Primary admin cannot be demoted
    if (targetUser.email === 'geoapparelspvtltd@gmail.com' && newRole === 'user') {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: newRole });
      
      // Update local state
      setSearchResults(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      fetchAdmins();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center text-black">Access Denied</h1>
        <p className="text-black/40 font-medium text-center mb-10 max-w-xs">
          Only admins can manage other admins.
        </p>
        <Button onClick={() => navigate('/')} className="w-full max-w-xs h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest">
          BACK TO HOME
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter text-black">Manage Admins</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-12">
        {/* Search Section */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-black/40">Search User by Email</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                <Input 
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="pl-12 h-14 rounded-2xl border-2 border-black/5 focus:border-black/20 transition-all font-bold bg-black/5 text-black"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSearching}
                className="h-14 px-8 bg-black text-white rounded-2xl font-black uppercase tracking-widest"
              >
                {isSearching ? '...' : 'Search'}
              </Button>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="p-6 bg-black/5 rounded-[32px] border-2 border-black/5">
              {searchResults.map(u => (
                <div key={u.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black/5 overflow-hidden border-2 border-black/5">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-6 h-6 text-black/20" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-black">{u.displayName || 'Unnamed User'}</h3>
                      <p className="text-xs text-black/40 font-bold">{u.email}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => toggleAdminRole(u)}
                    className={cn(
                      "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                      u.role === 'admin' ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-black text-white hover:bg-black/90"
                    )}
                  >
                    {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Current Admins List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-black/40">Current Admins</h2>
            <div className="h-[1px] flex-grow bg-black/10 ml-4" />
          </div>

          <div className="space-y-4">
            {isLoadingAdmins ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            ) : admins.length > 0 ? (
              admins.map(admin => (
                <div key={admin.uid} className="flex items-center justify-between p-4 border-2 border-black/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-black/5 overflow-hidden">
                      {admin.photoURL ? (
                        <img src={admin.photoURL} alt={admin.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-black/20" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black uppercase tracking-tight text-sm text-black">{admin.displayName || 'Unnamed User'}</h3>
                        <Shield className="w-3 h-3 text-black" />
                      </div>
                      <p className="text-[10px] text-black/30 font-bold">{admin.email}</p>
                    </div>
                  </div>
                  {isPrimaryAdmin && admin.email !== 'geoapparelspvtltd@gmail.com' && (
                    <button 
                      onClick={() => toggleAdminRole(admin)}
                      className="p-2 text-black/20 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-black/40 font-bold py-8">No admins found.</p>
            )}
          </div>
        </section>
      </div>
      <BrandSignature variant="dark" className="mb-20 opacity-20" />
    </div>
  );
}
