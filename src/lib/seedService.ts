import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SEED_PRODUCTS = [
  {
    name: "Namate Signature Oversized Tee",
    price: 1499,
    category: "T-Shirts",
    description: "The ultimate expression of comfort and style. Crafted from 240GSM heavy-weight cotton, this oversized tee features our signature Namate branding in high-density puff print. Perfect for the tribe that values quality over everything.",
    images: [
      "https://picsum.photos/seed/tee1/800/1000",
      "https://picsum.photos/seed/tee2/800/1000"
    ],
    sizes: ["S", "M", "L", "XL"],
    isNew: true,
    videoUrl: ""
  },
  {
    name: "Urban Nomad Cargo Joggers",
    price: 2499,
    category: "Joggers",
    description: "Functional meets aesthetic. These joggers feature multi-pocket utility design with adjustable drawstrings and premium ribbed cuffs. Built for the urban explorer who never compromises on movement.",
    images: [
      "https://picsum.photos/seed/joggers1/800/1000",
      "https://picsum.photos/seed/joggers2/800/1000"
    ],
    sizes: ["M", "L", "XL"],
    isNew: true,
    videoUrl: ""
  },
  {
    name: "Midnight Stealth Hoodie",
    price: 2999,
    category: "Hoodies",
    description: "Deep black, ultra-soft fleece lining, and a structured hood that holds its shape. The Midnight Stealth Hoodie is a staple for late-night sessions and early-morning grinds.",
    images: [
      "https://picsum.photos/seed/hoodie1/800/1000",
      "https://picsum.photos/seed/hoodie2/800/1000"
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    isNew: false,
    videoUrl: ""
  },
  {
    name: "Tribe Essential Cap",
    price: 899,
    category: "Accessories",
    description: "Complete the look with the Tribe Essential Cap. Featuring 3D embroidery and an adjustable strap for the perfect fit. A mark of belonging to the Namate community.",
    images: [
      "https://picsum.photos/seed/cap1/800/1000"
    ],
    sizes: ["One Size"],
    isNew: true,
    videoUrl: ""
  }
];

export async function seedProducts() {
  console.log("Starting store seed process...");
  const productsCol = collection(db, 'products');
  
  try {
    const promises = SEED_PRODUCTS.map(async (product, index) => {
      console.log(`Seeding product ${index + 1}: ${product.name}`);
      return addDoc(productsCol, {
        ...product,
        createdAt: serverTimestamp()
      });
    });
    
    const results = await Promise.all(promises);
    console.log(`Successfully seeded ${results.length} products.`);
    return results;
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}
