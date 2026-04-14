import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

interface QuickAddSheetProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    images?: string[];
    sizes: string[];
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  startPos?: { x: number, y: number };
}

export default function QuickAddSheet({ product, isOpen, onOpenChange, startPos }: QuickAddSheetProps) {
  const [selectedSize, setSelectedSize] = useState('');
  const { addToCart } = useCart();

  const handleAdd = () => {
    if (!selectedSize && product.sizes.length > 0) {
      return;
    }

    addToCart(product, selectedSize, startPos);
    onOpenChange(false);
    setSelectedSize('');
  };

  const displayImage = product.images && product.images.length > 0 ? product.images[0] : product.image;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[40px] px-6 pb-12">
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
        
        <div className="flex gap-6 mb-8">
          <div className="w-24 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
            <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-black uppercase tracking-tighter leading-tight mb-2">{product.name}</h3>
            <p className="text-2xl font-black text-black">₹{product.price}</p>
          </div>
        </div>

        <div className="mb-10">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Select Size</h4>
          <div className="flex flex-wrap gap-3">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "flex-shrink-0 min-w-[56px] h-14 px-4 rounded-2xl border-2 font-black transition-all flex items-center justify-center",
                  selectedSize === size 
                    ? "bg-black border-black text-white" 
                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleAdd}
          className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          ADD TO CART
        </Button>
      </SheetContent>
    </Sheet>
  );
}
