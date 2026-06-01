import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getCachedProfile, setCachedProfile, clearCachedProfile } from '../lib/auth-cache';

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
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        const data = snap.exists() ? snap.data() : null;
        setProfile(data);
        if (data) await setCachedProfile(data);
      } else {
        setProfile(null);
        await clearCachedProfile();
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const reloadProfile = async () => {
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    const data = snap.exists() ? snap.data() : null;
    setProfile(data);
    if (data) await setCachedProfile(data);
  };

  const signIn = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await clearCachedProfile();
  };

  const isOnboarded = profile?.onboardingComplete === true;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isOnboarded, reloadProfile, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
