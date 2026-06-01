import { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [data, setData] = useState({
    phone: '',
    email: '',
    password: '',
    displayName: '',
    username: '',
    photoURL: '',
    city: '',
    cohortPreferences: [],
    spotifyConnected: false,
    spotifyTokens: null,
    genreVector: null,
  });

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  return (
    <OnboardingContext.Provider value={{ data, update }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
