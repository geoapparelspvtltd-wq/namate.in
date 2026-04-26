import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch, query, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any, size?: string, startPos?: { x: number, y: number }) => void;
  updateQuantity: (id: string, size: string | undefined, delta: number) => void;
  removeFromCart: (id: string, size?: string) => void;
  clearCart: () => void;
  isAnimating: boolean;
  animationPos: { x: number, y: number } | null;
  animationImage: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPos, setAnimationPos] = useState<{ x: number, y: number } | null>(null);
  const [animationImage, setAnimationImage] = useState<string | null>(null);
  const isSyncing = useRef(false);
  const guestItemsBuffer = useRef<CartItem[]>([]);

  // Capture items when user is not logged in to buffer them for migration
  useEffect(() => {
    if (!user) {
      guestItemsBuffer.current = items;
    }
  }, [items, user]);

  // Sync from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    const cartRef = collection(db, 'users', user.uid, 'cart');
    
    // Migration: If there are guest items, upload them to Firestore
    const migrateGuestItems = async () => {
      if (guestItemsBuffer.current.length > 0) {
        const batch = writeBatch(db);
        guestItemsBuffer.current.forEach(item => {
          const itemPath = `${item.id}${item.size ? `-${item.size}` : ''}`;
          const itemRef = doc(db, 'users', user.uid, 'cart', itemPath);
          batch.set(itemRef, { ...item, addedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
        guestItemsBuffer.current = [];
      }
    };
    
    migrateGuestItems();

    const unsubscribe = onSnapshot(cartRef, (snapshot) => {
      if (isSyncing.current) return;
      const firestoreItems = snapshot.docs.map(doc => ({
        ...doc.data() as CartItem
      }));
      setItems(firestoreItems);
    });

    return () => unsubscribe();
  }, [user]);

  const addToCart = useCallback(async (product: any, size?: string, startPos?: { x: number, y: number }) => {
    const newItem = { ...product, size, quantity: 1 };
    
    setItems(prev => {
      const existingIdx = prev.findIndex(item => item.id === product.id && item.size === size);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, newItem];
    });

    if (user) {
      isSyncing.current = true;
      try {
        const itemPath = `${product.id}${size ? `-${size}` : ''}`;
        const itemRef = doc(db, 'users', user.uid, 'cart', itemPath);
        
        // Check if exists in firestore to increment or set
        const firestoreItem = items.find(item => item.id === product.id && item.size === size);
        const quantity = firestoreItem ? firestoreItem.quantity + 1 : 1;
        
        await setDoc(itemRef, {
          ...newItem,
          quantity,
          addedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Error adding to firestore cart:", err);
      } finally {
        isSyncing.current = false;
      }
    }
    
    // Trigger animation state
    setIsAnimating(true);
    if (startPos) {
      setAnimationPos(startPos);
      setAnimationImage(product.image);
    }
    
    setTimeout(() => {
      setIsAnimating(false);
      setAnimationPos(null);
      setAnimationImage(null);
    }, 800);
  }, [user, items]);

  const updateQuantity = useCallback(async (id: string, size: string | undefined, delta: number) => {
    let updatedItem: CartItem | undefined;
    
    setItems(prev => prev.map(item => {
      if (item.id === id && item.size === size) {
        const newQty = Math.max(1, item.quantity + delta);
        updatedItem = { ...item, quantity: newQty };
        return updatedItem;
      }
      return item;
    }));

    if (user && updatedItem) {
      isSyncing.current = true;
      try {
        const itemPath = `${id}${size ? `-${size}` : ''}`;
        const itemRef = doc(db, 'users', user.uid, 'cart', itemPath);
        await setDoc(itemRef, { quantity: updatedItem.quantity }, { merge: true });
      } catch (err) {
        console.error("Error updating qty in firestore:", err);
      } finally {
        isSyncing.current = false;
      }
    }
  }, [user]);

  const removeFromCart = useCallback(async (id: string, size?: string) => {
    setItems(prev => prev.filter(item => !(item.id === id && item.size === size)));

    if (user) {
      isSyncing.current = true;
      try {
        const itemPath = `${id}${size ? `-${size}` : ''}`;
        await deleteDoc(doc(db, 'users', user.uid, 'cart', itemPath));
      } catch (err) {
        console.error("Error removing from firestore cart:", err);
      } finally {
        isSyncing.current = false;
      }
    }
  }, [user]);

  const clearCart = useCallback(async () => {
    setItems([]);

    if (user) {
      isSyncing.current = true;
      try {
        const cartRef = collection(db, 'users', user.uid, 'cart');
        const snapshot = await getDocs(cartRef);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch (err) {
        console.error("Error clearing firestore cart:", err);
      } finally {
        isSyncing.current = false;
      }
    }
  }, [user]);

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      updateQuantity,
      removeFromCart, 
      clearCart, 
      isAnimating, 
      animationPos,
      animationImage
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
