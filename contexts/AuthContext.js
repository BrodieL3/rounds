import { createContext, useContext, useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from '../lib/auth-cache';
import { loadUserProfile } from '../lib/auth-profile';
import { posthog } from '../src/config/posthog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const cached = await getCachedProfile();
      if (mounted && cached) {
        setProfile(cached);
      }
    }
    bootstrap();

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;
      setUser(firebaseUser);
      if (firebaseUser) {
        posthog.identify(firebaseUser.uid, { $set: { email: firebaseUser.email } });
      }
      try {
        if (firebaseUser) {
          // ISC-5: loadUserProfile never throws — a Firestore failure resolves
          // to { profile: null, error } instead of escaping the callback.
          const { profile: data } = await loadUserProfile(firebaseUser.uid, {
            db,
            doc,
            getDoc,
            setCachedProfile,
          });
          if (mounted) setProfile(data);
        } else {
          setProfile(null);
          await clearCachedProfile();
        }
      } finally {
        // Must always run so the app can leave the loading state even if the
        // profile fetch or cache clear fails.
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const reloadProfile = async () => {
    if (!user) return;
    const { profile: data } = await loadUserProfile(user.uid, {
      db,
      doc,
      getDoc,
      setCachedProfile,
    });
    setProfile(data);
  };

  const signIn = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    posthog.identify(cred.user.uid, { $set: { email: cred.user.email } });
    posthog.capture('user_signed_in', { email: cred.user.email });
    return cred;
  };

  // ISC-1: in-app, self-serve account creation. onAuthStateChanged fires on
  // success and bootstraps the (still empty) profile through the same path.
  const signUp = async (email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    posthog.identify(cred.user.uid, {
      $set: { email: cred.user.email },
      $set_once: { signup_date: new Date().toISOString() },
    });
    posthog.capture('user_signed_up', { email: cred.user.email });
    return cred;
  };

  const signOut = async () => {
    posthog.capture('user_signed_out');
    posthog.reset();
    await firebaseSignOut(auth);
    await clearCachedProfile();
  };

  const isOnboarded = profile?.onboardingComplete === true;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isOnboarded, reloadProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
