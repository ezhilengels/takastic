import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Configure Google Sign-In once
GoogleSignin.configure({
  webClientId: '513069323900-npbprbk6l45t5ediq00dneq5c62r6a8e.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  offlineAccess: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    // Sign out from Google if signed in natively
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      }
    } catch {}

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Check Play Services availability
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any cached Google session so account picker always shows
      try { await GoogleSignin.signOut(); } catch {}

      // Native Google sign-in — no browser redirect needed!
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) throw new Error('No ID token received from Google');

      // Pass the token to Supabase through our Cloudflare proxy ✅
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      if (data?.session) setSession(data.session);

    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      } else if (err.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign-in already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw err;
      }
    }
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signUp, signOut, signInWithGoogle }),
    [session, loading, signIn, signUp, signOut, signInWithGoogle],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
