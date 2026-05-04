// Auth Context and Hooks - src/lib/auth/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserProfile } from '@/types/firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string, profileData: Partial<UserProfile>) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let loadTimeout: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;

    const attemptAuthInit = async () => {
      try {
        // Set a timeout in case Firestore takes too long or is offline
        loadTimeout = setTimeout(() => {
          if (mounted && retryCount < maxRetries) {
            retryCount++;
            // Retry auth initialization
            attemptAuthInit();
          } else if (mounted) {
            // After max retries, mark as ready but show error
            console.warn('Auth initialization failed after retries - marking as ready anyway');
            setLoading(false);
            setAuthError('Having trouble connecting to our services. Some features may be limited.');
          }
        }, 3000); // Increased timeout to 3 seconds

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;
          
          try {
            clearTimeout(loadTimeout); // Clear timeout on successful auth change
            
            if (firebaseUser) {
              setUser(firebaseUser);
              try {
                const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (profileDoc.exists() && mounted) {
                  setUserProfile(profileDoc.data() as UserProfile);
                } else if (mounted) {
                  setUserProfile(null);
                }
              } catch (firestoreError: any) {
                // If offline or other Firestore error, just continue
                // User will still be authenticated, just profile won't load
                if (mounted) {
                  console.warn('Could not load user profile (client offline or error):', firestoreError.message);
                  setUserProfile(null);
                  // Don't set loading to false here - user is still authenticated
                }
              }
            } else {
              if (mounted) {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
              }
            }
          } finally {
            if (mounted) {
              setLoading(false);
              clearTimeout(loadTimeout);
            }
          }
        });

        return () => {
          mounted = false;
          clearTimeout(loadTimeout);
          unsubscribe();
        };
      } catch (error) {
        if (mounted) {
          console.error('Auth initialization error:', error);
          setLoading(false);
          setAuthError('Unable to initialize authentication service.');
        }
      }
    };

    attemptAuthInit();
  }, []);

  const login = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string, 
    password: string, 
    profileData: Partial<UserProfile>
  ) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const role = profileData.role ?? 'leader';
    const profile: UserProfile = {
      id: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName: userCredential.user.displayName || profileData.displayName || '',
      role,
      termId: profileData.termId,
      departmentId: profileData.departmentId,
      sectionId: profileData.sectionId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Write profile/group records in the background so account creation doesn't hang
    void setDoc(doc(db, 'users', userCredential.user.uid), profile).catch((error) => {
      console.warn('Could not save user profile immediately:', error);
    });

    // Only create a group for leaders (not for coordinators, admins, teachers, or students)
    if (role === 'leader') {
      void setDoc(doc(db, 'groups', userCredential.user.uid), {
        leaderId: userCredential.user.uid,
        termId: profileData.termId ?? '',
        departmentId: profileData.departmentId ?? '',
        sectionId: profileData.sectionId ?? '',
        title: null,
        adviserName: null,
        stage: 'title',
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }).catch((error) => {
        console.warn('Could not save leader group immediately:', error);
      });
    }
    
    return userCredential;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
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
