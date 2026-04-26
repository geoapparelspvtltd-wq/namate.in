import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { auth, db } from './firebase';
import { toast } from 'sonner';

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  awardPoints: (amount: number, description: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          const userRef = doc(db, 'users', firebaseUser.uid);
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
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Logged in successfully!");
    } catch (error) {
      console.error("Error logging in with Google:", error);
      toast.error("Failed to login. Please try again.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout.");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, role, loading, loginWithGoogle, logout, awardPoints }}>
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
