import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithCredential,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';

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
  // Don't throw here to avoid crashing the auth flow, but we can log it
}

interface AuthContextType {
  user: User | null;
  userData: any | null;
  role: string | null;
  loading: boolean;
  isMaintenanceMode: boolean;
  maintenanceLoading: boolean;
  isNative: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (identifier: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, phone: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  awardPoints: (amount: number, description: string) => Promise<void>;
  toggleMaintenanceMode: (enabled: boolean) => Promise<void>;
  requestNativeLocation: () => void;
  requestNotificationToken: () => void;
  requestImagePick: (source: 'gallery' | 'camera', context?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);

  // Native detection & Bridge Listeners
  useEffect(() => {
    // Native detection
    const checkNative = () => {
      const hasFlutterBridge = 
        !!(window as any).FlutterPaymentChannel || 
        !!(window as any).FlutterNotificationChannel || 
        !!(window as any).FlutterMediaChannel ||
        navigator.userAgent.includes('NamateApp') ||
        navigator.userAgent.includes('Flutter');
      
      setIsNative(hasFlutterBridge);
      return hasFlutterBridge;
    };
    
    checkNative();
    // Sometimes the bridge is injected slightly after page load
    const timeoutId = setTimeout(checkNative, 1000);

    // Listener for Flutter messages
    const handleFlutterMessage = async (event: any) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try { 
            data = JSON.parse(data); 
          } catch (e) { 
            return; 
          }
        }
        
        if (!data || typeof data !== 'object') return;
        
        console.log("Bridge Message Received:", data.type, data);
        
        if (data.type === 'FLUTTER_LOGIN_SUCCESS') {
          const idToken = data.idToken || data.id_token || data.token;
          const accessToken = data.accessToken || data.access_token;
          
          console.log("Flutter Login Success! Tokens received:", { idToken: !!idToken, accessToken: !!accessToken });
          
          if (!idToken) {
            toast.error("Bridge Error: idToken is missing from Flutter");
            return;
          }

          toast.info("Logging you in via App...");
          setLoading(true);
          try {
            const credential = GoogleAuthProvider.credential(idToken, accessToken);
            await signInWithCredential(auth, credential);
            triggerHaptic('success');
            toast.success("Logged in with Google via Flutter!");
          } catch (error: any) {
            console.error("Flutter Sign-In Error Details:", error);
            toast.error(`Login Failed: ${error.message || "Unknown error"}`);
          } finally {
            setLoading(false);
          }
        }

        if (data.type === 'FLUTTER_LOGIN_ERROR') {
          console.error("Bridge Error from Flutter:", data.error);
          setLoading(false);
          toast.error(`Google Picker Error: ${data.error}`);
        }

        // Handle Notification Token from Flutter
        if ((data.type === 'FLUTTER_NOTIFICATION_TOKEN' || data.type === 'NOTIFICATION_TOKEN_RECEIVED') && data.token && auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userRef, { fcmToken: data.token }, { merge: true });
          console.log("FCM Token saved for background notifications");
        }

        // Forward location success to specific listeners
        if (data.type === 'FLUTTER_LOCATION_SUCCESS') {
          console.log("Location received from Bridge:", data);
          window.dispatchEvent(new CustomEvent('flutterLocationSuccess', { detail: { data } }));
        }

        if (data.type === 'FLUTTER_IMAGE_SUCCESS') {
          console.log("Image received from Bridge:", data);
          window.dispatchEvent(new CustomEvent('flutterImageSuccess', { detail: { data, context: data.context } }));
        }
      } catch (e) {
        console.error("Critical bridge error:", e);
      }
    };

    // DIRECT BRIDGE: Define global functions for the Flutter app to call directly.
    (window as any).onFlutterLogin = (data: any) => {
      console.log("Bridge: Direct Login Call");
      handleFlutterMessage({ data });
    };

    (window as any).onFlutterImageSuccess = (data: any) => {
      console.log("Bridge: Direct Image Call", data);
      handleFlutterMessage({ data: { ...data, type: 'FLUTTER_IMAGE_SUCCESS' } });
    };

    (window as any).onFlutterLoginSuccess = (data: any) => {
      console.log("Bridge: Direct Login Success Call");
      handleFlutterMessage({ data: { ...data, type: 'FLUTTER_LOGIN_SUCCESS' } });
    };

    (window as any).onFlutterLoginError = (error: any) => {
      console.log("Bridge: Direct Login Error Call");
      handleFlutterMessage({ data: { type: 'FLUTTER_LOGIN_ERROR', error: typeof error === 'string' ? error : JSON.stringify(error) } });
    };

    (window as any).onFlutterLocationSuccess = (data: any, requestId?: string) => {
      console.log("Bridge: Direct Location Call", { data, requestId });
      const eventData = { ...data, type: 'FLUTTER_LOCATION_SUCCESS', requestId };
      window.dispatchEvent(new CustomEvent('flutterLocationSuccess', { detail: { data: eventData, requestId } }));
    };

    (window as any).onFlutterNotificationToken = (data: any) => {
      console.log("Bridge: Direct Notification Token Call", data);
      const token = typeof data === 'string' ? data : (data.token || data.fcmToken);
      handleFlutterMessage({ data: { type: 'FLUTTER_NOTIFICATION_TOKEN', token } });
      
      // Also dispatch custom event for specific listeners
      const event = new CustomEvent('flutterNotificationToken', { detail: { data } });
      window.dispatchEvent(event);
    };

    (window as any).debugBridge = (type: string, payload: any) => {
      console.log("Bridge: Debug Call", type, payload);
      handleFlutterMessage({ data: { type, ...payload } });
    };

    window.addEventListener('message', handleFlutterMessage);

    const configRef = doc(db, 'system_configs', 'main');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsMaintenanceMode(snapshot.data().isMaintenanceMode || false);
      } else {
        // Initialize if not exists
        setDoc(configRef, { 
          isMaintenanceMode: false,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      setMaintenanceLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_configs/main');
      setMaintenanceLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      window.removeEventListener('message', handleFlutterMessage);
      delete (window as any).onFlutterLogin;
      delete (window as any).onFlutterImageSuccess;
      delete (window as any).onFlutterLoginSuccess;
      delete (window as any).onFlutterLoginError;
      delete (window as any).onFlutterLocationSuccess;
      delete (window as any).onFlutterNotificationToken;
      delete (window as any).debugBridge;
    };
  }, []);

  const requestNativeLocation = () => {
    if ((window as any).FlutterNotificationChannel) {
      try {
        (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
          type: 'LOCATION_REQUEST'
        }));
      } catch (e) {
        console.error("Failed to send location request to bridge", e);
      }
    }
  };

  const requestNotificationToken = () => {
    if ((window as any).FlutterNotificationChannel) {
      try {
        (window as any).FlutterNotificationChannel.postMessage(JSON.stringify({
          type: 'NOTIFICATION_TOKEN_REQUEST'
        }));
      } catch (e) {
        console.error("Failed to send notification request to bridge", e);
      }
    }
  };

  const requestImagePick = (source: 'gallery' | 'camera', context?: string) => {
    if ((window as any).FlutterMediaChannel) {
      try {
        (window as any).FlutterMediaChannel.postMessage(JSON.stringify({
          type: 'IMAGE_PICK_REQUEST',
          source: source,
          context: context
        }));
      } catch (e) {
        console.error("Failed to send image pick request to bridge", e);
      }
    }
  };

  useEffect(() => {
    if (user && isNative) {
      setTimeout(requestNotificationToken, 2000);
    }
  }, [user, isNative]);

  const toggleMaintenanceMode = async (enabled: boolean) => {
    if (role !== 'admin') return;
    try {
      const configRef = doc(db, 'system_configs', 'main');
      await setDoc(configRef, {
        isMaintenanceMode: enabled,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      toast.error("Failed to update status");
    }
  };

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      sessionStorage.setItem('referral_source', refCode);
    }
  }, []);

  const awardPoints = async (amount: number, description: string) => {
    if (!user) return;
    try {
      triggerHaptic('success');
      const userRef = doc(db, 'users', user.uid);
      const pointsRef = doc(collection(db, 'users', user.uid, 'points_history'));
      
      await runTransaction(db, async (transaction) => {
        transaction.update(userRef, {
          namatePoints: increment(amount)
        });
        transaction.set(pointsRef, {
          points: amount,
          type: 'earn',
          description,
          createdAt: serverTimestamp()
        });
      });
      toast.success(`Earned ${amount} Namate Points!`);
    } catch (error) {
      console.error("Error awarding points:", error);
    }
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser?.email);
      console.log("Using Firestore Database ID:", (db as any)._databaseId?.database || 'default');
      
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          try {
            // Small delay to ensure auth token is propagated to Firestore rules
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const userRef = doc(db, 'users', firebaseUser.uid);
            console.log("Fetching user doc for:", firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
              // New user registration
              const referralSource = sessionStorage.getItem('referral_source');
              let referrerId = '';
              
              if (referralSource) {
                const q = query(collection(db, 'users'), where('referralCode', '==', referralSource));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                  referrerId = qSnap.docs[0].id;
                  // Award points to referrer for successful referral
                  const referrerRef = doc(db, 'users', referrerId);
                  const referrerPointsRef = doc(collection(db, 'users', referrerId, 'points_history'));
                  
                  await runTransaction(db, async (transaction) => {
                    transaction.update(referrerRef, {
                      walletBalance: increment(100) // "Refer and earn 100 coins"
                    });
                    transaction.set(referrerPointsRef, {
                      points: 100,
                      type: 'earn',
                      description: `Referral of ${firebaseUser.email}`,
                      createdAt: serverTimestamp()
                    });
                  });
                  sessionStorage.removeItem('referral_source');
                }
              }

              const newUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: firebaseUser.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com' ? 'admin' : 'user',
                isTribeMember: false,
                walletBalance: 0,
                namatePoints: 0,
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                referredBy: referrerId,
                createdAt: serverTimestamp()
              };
              await setDoc(userRef, newUser);
            } else {
              // Check if existing user has referral code, if not generate one
              const data = userSnap.data();
              if (!data.referralCode) {
                await setDoc(userRef, { 
                  referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
                }, { merge: true });
              }
            }

            // Real-time listener for user data
            userUnsubscribe = onSnapshot(userRef, (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data();
                if (firebaseUser.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com' && data.role !== 'admin') {
                  setDoc(userRef, { role: 'admin' }, { merge: true });
                  setRole('admin');
                  setUserData({ ...data, role: 'admin' });
                } else {
                  setRole(data.role || 'user');
                  setUserData(data);
                }
              }
            });
          } catch (error) {
            console.error("Error in Auth State Sync:", error);
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            // Still set the user and role even if firestore sync fails
            if (firebaseUser.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com') {
              setRole('admin');
            }
          }
        } else {
          setUser(null);
          setUserData(null);
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    if (isNative) {
      const channel = (window as any).FlutterNotificationChannel || (window as any).FlutterLoginChannel || (window as any).FlutterAuthChannel;
      if (channel) {
        try {
          triggerHaptic('medium');
          toast.info("Opening Google Login...");
          channel.postMessage(JSON.stringify({
            type: 'GOOGLE_LOGIN_REQUEST'
          }));
          // We wait for the 'message' event listener to handle the result
          return;
        } catch (e) {
          console.error("Flutter login bridge failed:", e);
          toast.error("App Bridge Error");
        }
      } else {
        console.warn("isNative is true but no Flutter channel (Notification, Login, or Auth) was found");
        toast.error("Native login channel missing");
        // Fallback to standard flow as a last resort
      }
    }

    const provider = new GoogleAuthProvider();
    try {
      triggerHaptic('medium');
      await signInWithPopup(auth, provider);
      triggerHaptic('success');
      toast.success("Logged in successfully!");
    } catch (error) {
      console.error("Error logging in with Google:", error);
      toast.error("Failed to login. Please try again.");
      throw error;
    }
  };

  const normalizePhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, '');
    
    // If it starts with 91 and has 12 digits, it's already got the prefix
    if (digits.startsWith('91') && digits.length === 12) {
      return '+' + digits;
    }
    
    // If it's 10 digits, add +91
    if (digits.length === 10) {
      return '+91' + digits;
    }
    
    // Otherwise return as is (could be incomplete or already prefixed with +)
    return phone.startsWith('+') ? phone : (digits ? '+' + digits : phone);
  };

  const loginWithEmail = async (identifier: string, password: string) => {
    try {
      triggerHaptic('medium');
      let email = identifier;
      
      // Check if identifier is a phone number (simple check: includes numbers and doesn't have @)
      if (!identifier.includes('@')) {
        const normalizedPhone = normalizePhoneNumber(identifier);
        // Try to find email associated with this phone number
        const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone));
        const qSnap = await getDocs(q);
        if (qSnap.empty) {
          throw new Error("No account found with this mobile number. Use your registered 10-digit number.");
        }
        email = qSnap.docs[0].data().email;
        if (!email) {
          throw new Error("No email associated with this mobile number.");
        }
      }

      await signInWithEmailAndPassword(auth, email, password);
      triggerHaptic('success');
      toast.success("Logged in successfully!");
    } catch (error: any) {
      console.error("Error logging in:", error);
      const message = error.message.includes('auth/invalid-credential') 
        ? "Invalid email/mobile or password." 
        : error.message;
      toast.error(message);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, phone: string, password: string, name: string) => {
    try {
      triggerHaptic('medium');
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Check if phone number is already in use
      const q = query(collection(db, 'users'), where('phone', '==', normalizedPhone));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        throw new Error("Mobile number already in use.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update profile name
      await updateProfile(firebaseUser, { displayName: name });
      
      // Create user document (this will be picked up by the auth state listener)
      const userRef = doc(db, 'users', firebaseUser.uid);
      const newUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        phone: normalizedPhone,
        displayName: name,
        role: email.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com' ? 'admin' : 'user',
        isTribeMember: false,
        walletBalance: 0,
        namatePoints: 0,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: serverTimestamp()
      };
      await setDoc(userRef, newUser);
      
      triggerHaptic('success');
      toast.success("Welcome to the Tribe!");
    } catch (error: any) {
      console.error("Error signing up:", error);
      const message = error.message.includes('auth/email-already-in-use')
        ? "Email already in use."
        : error.message;
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      triggerHaptic('light');
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout.");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      role, 
      loading, 
      isMaintenanceMode,
      maintenanceLoading,
      isNative,
      loginWithGoogle, 
      loginWithEmail,
      signupWithEmail,
      logout, 
      awardPoints,
      toggleMaintenanceMode,
      requestNativeLocation,
      requestNotificationToken,
      requestImagePick
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
