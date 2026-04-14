import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser?.email);
      console.log("Using Firestore Database ID:", (db as any)._databaseId?.database || 'default');
      try {
        if (firebaseUser) {
          try {
            // Small delay to ensure auth token is propagated to Firestore rules
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Sync user data to Firestore
            const userRef = doc(db, 'users', firebaseUser.uid);
            console.log("Fetching user doc for:", firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
              console.log("User doc does not exist, creating...");
              // Create new user profile
              const newUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: firebaseUser.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com' ? 'admin' : 'user',
                isTribeMember: false,
                createdAt: serverTimestamp()
              };
              await setDoc(userRef, newUser);
              setRole(newUser.role);
              setUserData(newUser);
            } else {
              const data = userSnap.data();
              console.log("User doc found:", data);
              // Force admin role for the primary admin email if it's not already set
              if (firebaseUser.email?.toLowerCase().trim() === 'geoapparelspvtltd@gmail.com' && data.role !== 'admin') {
                console.log("Forcing admin role for primary admin");
                const updatedData = { ...data, role: 'admin' };
                await setDoc(userRef, { role: 'admin' }, { merge: true });
                setRole('admin');
                setUserData(updatedData);
              } else {
                setRole(data.role);
                setUserData(data);
              }
            }
            setUser(firebaseUser);
          } catch (error) {
            console.error("Error in Auth State Sync:", error);
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            // Still set the user and role even if firestore sync fails
            setUser(firebaseUser);
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

    return () => unsubscribe();
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
    <AuthContext.Provider value={{ user, userData, role, loading, loginWithGoogle, logout }}>
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
