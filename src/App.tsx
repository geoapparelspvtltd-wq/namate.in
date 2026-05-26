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
const Gallery = lazy(() => import('./pages/Gallery'));
const ManageGallery = lazy(() => import('./pages/ManageGallery'));
const ManageWallets = lazy(() => import('./pages/ManageWallets'));
const ManageCategories = lazy(() => import('./pages/ManageCategories'));
const ManageNotifications = lazy(() => import('./pages/ManageNotifications'));
const Notifications = lazy(() => import('./pages/Notifications'));
const TrialRoom = lazy(() => import('./pages/TrialRoom'));

import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import FloatingCart from './components/FloatingCart';
import FloatingBag from './components/FloatingBag';
import { CartProvider, useCart } from './lib/CartContext';
import { WishlistProvider } from './lib/WishlistContext';
import { AuthProvider } from './lib/AuthContext';
import { SearchProvider } from './lib/SearchContext';
import SplashScreen from './components/SplashScreen';
import ScrollToTop from './components/ScrollToTop';
import { NativeAppBanner } from './components/NativeAppBanner';
import { NotificationBridge } from './components/NotificationBridge';
import ErrorBoundary from './components/ErrorBoundary';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Toaster } from 'sonner';
import { useAuth } from './lib/AuthContext';
import MaintenanceMode from './components/MaintenanceMode';

function AnimatedRoutes() {
  const location = useLocation();
  const { isMaintenanceMode, role } = useAuth();
  
  if (isMaintenanceMode && role !== 'admin') {
    return <MaintenanceMode />;
  }
  
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
            <Route path="/add-product/:id" element={<PageWrapper><AddProduct /></PageWrapper>} />
            <Route path="/manage-admins" element={<PageWrapper><ManageAdmins /></PageWrapper>} />
            <Route path="/orders-dashboard" element={<PageWrapper><OrdersDashboard /></PageWrapper>} />
            <Route path="/my-orders" element={<PageWrapper><UserOrders /></PageWrapper>} />
            <Route path="/manage-products" element={<PageWrapper><ManageProducts /></PageWrapper>} />
            <Route path="/gallery" element={<PageWrapper><Gallery /></PageWrapper>} />
            <Route path="/manage-gallery" element={<PageWrapper><ManageGallery /></PageWrapper>} />
            <Route path="/manage-wallets" element={<PageWrapper><ManageWallets /></PageWrapper>} />
            <Route path="/manage-categories" element={<PageWrapper><ManageCategories /></PageWrapper>} />
            <Route path="/manage-notifications" element={<PageWrapper><ManageNotifications /></PageWrapper>} />
            <Route path="/notifications" element={<PageWrapper><Notifications /></PageWrapper>} />
            <Route path="/trial-room" element={<PageWrapper><TrialRoom /></PageWrapper>} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function PageLoader() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-6">
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center p-3"
      >
        <div 
          className="w-full h-full bg-black/20"
          style={{ 
            WebkitMaskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
            maskImage: "url('https://i.ibb.co/rG66vw6q/Chat-GPT-Image-Apr-10-2026-12-40-57-AM.png')",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
          }}
        />
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.5, 0.1]
            }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              delay: i * 0.2,
              ease: "easeInOut" 
            }}
            className="w-1.5 h-1.5 bg-black rounded-full"
          />
        ))}
      </div>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  const { isNative } = useAuth();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isNative ? 50 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isNative ? -50 : -20 }}
      transition={{ 
        duration: isNative ? 0.4 : 0.3, 
        ease: [0.32, 0.72, 0, 1] // Native-like spring/bezier
      }}
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
      <ScrollToTop />
      <AuthProvider>
        <AppContent isLoading={isLoading} setIsLoading={setIsLoading} />
      </AuthProvider>
    </Router>
  );
}

function GlobalCartAnimation() {
  const { isAnimating } = useCart();
  return <FloatingBag isVisible={isAnimating} onComplete={() => {}} />;
}

function AdminMaintenanceBadge() {
  const { isMaintenanceMode, role, toggleMaintenanceMode } = useAuth();
  
  if (role !== 'admin' || !isMaintenanceMode) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 border border-white/20">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      SITE IS OFF (ONLY ADMINS CAN SEE)
      <button 
        onClick={() => toggleMaintenanceMode(false)}
        className="px-3 py-1 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"
      >
        GO LIVE
      </button>
    </div>
  );
}

function AppContent({ isLoading, setIsLoading }: { isLoading: boolean, setIsLoading: (val: boolean) => void }) {
  const { isMaintenanceMode, role, isNative } = useAuth();

  const showSplash = isLoading;
  
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <SearchProvider>
        <WishlistProvider>
          <CartProvider>
            <GlobalCartAnimation />
            <AdminMaintenanceBadge />
            {showSplash && <SplashScreen onComplete={() => setIsLoading(false)} />}
            <div 
              className={cn(
                "min-h-screen flex flex-col font-sans selection:bg-primary selection:text-primary-foreground relative overflow-hidden transition-opacity duration-300 w-full md:max-w-md lg:max-w-lg mx-auto md:shadow-[0_0_80px_rgba(0,0,0,0.06)] md:border-x md:border-black/[0.04]",
                showSplash ? "opacity-0" : "opacity-100"
              )}
              style={{ backgroundColor: '#F7F4F0' }}
            >
              {/* Subtle natural linen grain feel */}
              <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:12px_12px] z-0" />

              <Navbar />
              <NativeAppBanner />
              <NotificationBridge />

              <main className="flex-grow relative z-10 pb-32">
                <AnimatedRoutes />
              </main>
              <FloatingCart />
              <BottomNav />
              <Toaster position="top-center" expand={false} richColors />
            </div>
          </CartProvider>
        </WishlistProvider>
      </SearchProvider>
    </ErrorBoundary>
  );
}
