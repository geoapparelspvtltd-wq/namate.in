import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Profile = lazy(() => import('./pages/Profile'));
const Tribe = lazy(() => import('./pages/Tribe'));
const Regal = lazy(() => import('./pages/Regal'));
const Sale = lazy(() => import('./pages/Sale'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const AddProduct = lazy(() => import('./pages/AddProduct'));
const ManageAdmins = lazy(() => import('./pages/ManageAdmins'));
const OrdersDashboard = lazy(() => import('./pages/OrdersDashboard'));
const UserOrders = lazy(() => import('./pages/UserOrders'));
const ManageProducts = lazy(() => import('./pages/ManageProducts'));

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import FloatingCart from './components/FloatingCart';
import { CartProvider } from './lib/CartContext';
import { WishlistProvider } from './lib/WishlistContext';
import { AuthProvider } from './lib/AuthContext';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Toaster } from 'sonner';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/shop" element={<PageWrapper><Shop /></PageWrapper>} />
            <Route path="/product/:id" element={<PageWrapper><ProductDetail /></PageWrapper>} />
            <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
            <Route path="/tribe" element={<PageWrapper><Tribe /></PageWrapper>} />
            <Route path="/regal" element={<PageWrapper><Regal /></PageWrapper>} />
            <Route path="/sale" element={<PageWrapper><Sale /></PageWrapper>} />
            <Route path="/wishlist" element={<PageWrapper><Wishlist /></PageWrapper>} />
            <Route path="/add-product" element={<PageWrapper><AddProduct /></PageWrapper>} />
            <Route path="/manage-admins" element={<PageWrapper><ManageAdmins /></PageWrapper>} />
            <Route path="/orders-dashboard" element={<PageWrapper><OrdersDashboard /></PageWrapper>} />
            <Route path="/my-orders" element={<PageWrapper><UserOrders /></PageWrapper>} />
            <Route path="/manage-products" element={<PageWrapper><ManageProducts /></PageWrapper>} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function PageLoader() {
  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#011c16] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      // Small delay to allow Firebase to initialize fully
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        console.log("Testing Firestore connection...");
        // Use a dummy path to test connection
        await getDocFromServer(doc(db, '_test_connection_', 'init'));
        console.log("Firestore connection successful.");
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Firestore Error: The client is offline. This usually means the 'firestoreDatabaseId' in firebase-applet-config.json is incorrect.");
        } else {
          console.log("Firestore connection test completed (ignoring non-connectivity errors).");
        }
      }
    }
    testConnection();
  }, []);

  return (
    <Router>
      <AppContent isLoading={isLoading} setIsLoading={setIsLoading} />
    </Router>
  );
}

function AppContent({ isLoading, setIsLoading }: { isLoading: boolean, setIsLoading: (val: boolean) => void }) {
  const location = useLocation();
  const isReelMode = location.pathname.startsWith('/product/');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            {isLoading && <SplashScreen onComplete={() => setIsLoading(false)} />}
            <div 
              className={cn(
                "min-h-screen flex flex-col font-sans selection:bg-primary selection:text-primary-foreground relative overflow-hidden transition-opacity duration-700",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              style={{ backgroundColor: '#ffffff' }}
            >
              {/* Ambient Soft Glow */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-black/[0.02] blur-[100px] rounded-full" />
                <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] bg-black/[0.02] blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-black/[0.02] blur-[80px] rounded-full" />
              </div>

              <main className={cn(
                "flex-grow relative z-10",
                !isReelMode ? "pb-32" : "pt-0 pb-0"
              )}>
                <AnimatedRoutes />
              </main>
              {!isReelMode && <FloatingCart />}
              {!isReelMode && <BottomNav />}
              <Toaster position="top-center" expand={false} richColors />
            </div>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
