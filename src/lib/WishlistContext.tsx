import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: WishlistItem) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: WishlistItem) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const isSyncing = useRef(false);
  const guestWishlistBuffer = useRef<WishlistItem[]>([]);

  // Load from local storage initially, then sync with firestore if logged in
  useEffect(() => {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      setWishlist(JSON.parse(saved));
    }
  }, []);

  // Capture items when user is not logged in to buffer them for migration
  useEffect(() => {
    if (!user) {
      guestWishlistBuffer.current = wishlist;
    }
  }, [wishlist, user]);

  // Sync from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem('wishlist');
      setWishlist(saved ? JSON.parse(saved) : []);
      return;
    }

    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');

    // Migration: If there are guest wishlist items, upload them
    const migrateGuestWishlist = async () => {
      if (guestWishlistBuffer.current.length > 0) {
        const { writeBatch, serverTimestamp } = await import('firebase/firestore');
        const batch = writeBatch(db);
        guestWishlistBuffer.current.forEach(item => {
          const itemRef = doc(db, 'users', user.uid, 'wishlist', item.id);
          batch.set(itemRef, { ...item, addedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
        guestWishlistBuffer.current = [];
      }
    };

    migrateGuestWishlist();

    const unsubscribe = onSnapshot(wishlistRef, (snapshot) => {
      if (isSyncing.current) return;
      const firestoreItems = snapshot.docs.map(doc => ({
        ...doc.data() as WishlistItem
      }));
      setWishlist(firestoreItems);
      localStorage.setItem('wishlist', JSON.stringify(firestoreItems));
    });

    return () => unsubscribe();
  }, [user]);

  // Persist to local storage for guests
  useEffect(() => {
    if (!user) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  const addToWishlist = useCallback(async (product: WishlistItem) => {
    setWishlist(prev => {
      if (prev.find(item => item.id === product.id)) return prev;
      return [...prev, product];
    });

    if (user) {
      isSyncing.current = true;
      try {
        const itemRef = doc(db, 'users', user.uid, 'wishlist', product.id);
        await setDoc(itemRef, {
          ...product,
          addedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error adding to firestore wishlist:", err);
      } finally {
        isSyncing.current = false;
      }
    }
  }, [user]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    setWishlist(prev => {
      return prev.filter(item => item.id !== productId);
    });

    if (user) {
      isSyncing.current = true;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId));
      } catch (err) {
        console.error("Error removing from firestore wishlist:", err);
      } finally {
        isSyncing.current = false;
      }
    }
  }, [user]);

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.id === productId);
  };

  const toggleWishlist = (product: WishlistItem) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
