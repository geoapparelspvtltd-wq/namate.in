import React, { createContext, useContext, useState, useCallback } from 'react';

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
  const [items, setItems] = useState<CartItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPos, setAnimationPos] = useState<{ x: number, y: number } | null>(null);
  const [animationImage, setAnimationImage] = useState<string | null>(null);

  const addToCart = useCallback((product: any, size?: string, startPos?: { x: number, y: number }) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.size === size);
      if (existing) {
        return prev.map(item => (item.id === product.id && item.size === size) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, size, quantity: 1 }];
    });

    if (startPos) {
      setAnimationPos(startPos);
      setAnimationImage(product.image);
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationPos(null);
        setAnimationImage(null);
      }, 800);
    }
  }, []);

  const updateQuantity = useCallback((id: string, size: string | undefined, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id && item.size === size) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const removeFromCart = useCallback((id: string, size?: string) => {
    setItems(prev => prev.filter(item => !(item.id === id && item.size === size)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

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
