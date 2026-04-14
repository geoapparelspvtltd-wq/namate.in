export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  isNew?: boolean;
  isPremium?: boolean;
  discount?: number;
  description: string;
  sizes: string[];
}

export const products: Product[] = [];
