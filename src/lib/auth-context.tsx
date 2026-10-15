'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile, Membership, UserRole } from '@/types';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  membership: Membership | null;
  organizationId: string | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;

  // Permissions
  can: (action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export') => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Role permission matrix
const ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  owner: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
  admin: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
  finance: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
  caregiver: { view: true, create: true, edit: true, delete: false, approve: false, export: false },
  parent: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
  auditor: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUserProfile(null);
        setMembership(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function loadUserData(firebaseUser: User) {
    try {
      // Load or create user profile
      const profileRef = doc(db, 'users', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Create profile for new users
        const newProfile: Omit<UserProfile, 'id'> = {
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          photoUrl: firebaseUser.photoURL || undefined,
          isEmailVerified: firebaseUser.emailVerified,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };
        await setDoc(profileRef, newProfile);
        setUserProfile({ id: firebaseUser.uid, ...newProfile });
      } else {
        setUserProfile({ id: firebaseUser.uid, ...profileSnap.data() } as UserProfile);
      }

      // Load active membership
      const { query, collection, where, limit, getDocs } = await import('firebase/firestore');
      const membershipsQuery = query(
        collection(db, 'memberships'),
        where('userId', '==', firebaseUser.uid),
        where('isActive', '==', true),
        limit(1)
      );
      const membershipsSnap = await getDocs(membershipsQuery);
      if (!membershipsSnap.empty) {
        const membershipData = { id: membershipsSnap.docs[0].id, ...membershipsSnap.docs[0].data() } as Membership;
        setMembership(membershipData);
        // Sync organizationId + role ke users doc agar Firestore Security Rules bisa membacanya
        try {
          await updateDoc(profileRef, {
            organizationId: membershipData.organizationId,
            role: membershipData.role,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Jika gagal (misal doc baru dibuat), coba setDoc merge
          await setDoc(profileRef, {
            organizationId: membershipData.organizationId,
            role: membershipData.role,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await loadUserData(result.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await loadUserData(result.user);
  };

  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await sendEmailVerification(result.user);
    await loadUserData(result.user);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setMembership(null);
  };

  const can = (action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'): boolean => {
    if (!membership?.role) return false;
    return ROLE_PERMISSIONS[membership.role]?.[action] ?? false;
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!membership?.role) return false;
    return roles.includes(membership.role);
  };

  const value: AuthContextValue = {
    user,
    userProfile,
    membership,
    organizationId: membership?.organizationId ?? null,
    role: membership?.role ?? null,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    can,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
