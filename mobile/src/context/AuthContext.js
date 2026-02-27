import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes (email/password + OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    // Handle OAuth deep link callback
    const handleDeepLink = async ({ url }) => {
      if (!url) return;
      if (!url.startsWith('taskastic://') && !url.includes('auth/callback')) return;

      console.log('🔗 Deep link received:', url);

      try {
        // Parse tokens from hash (implicit flow) or query (pkce fallback)
        const hashPart = url.includes('#') ? url.split('#')[1] : null;
        const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] : null;
        const params = new URLSearchParams(hashPart || queryPart || '');

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const code = params.get('code');
        const error_desc = params.get('error_description');

        console.log('🔑 Parsed → access_token:', !!access_token, '| refresh_token:', !!refresh_token, '| code:', !!code, '| error:', error_desc);

        if (error_desc) {
          console.error('OAuth error from server:', error_desc);
          return;
        }

        if (access_token && refresh_token) {
          console.log('✅ Setting session with tokens...');
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          console.log('setSession result → session:', !!data?.session, '| error:', error?.message);
          if (error) throw error;
          if (data?.session) setSession(data.session);
        } else if (code) {
          console.log('🔄 Got code (PKCE), trying exchangeCodeForSession...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          console.log('exchange result → session:', !!data?.session, '| error:', error?.message);
          if (error) throw error;
          if (data?.session) setSession(data.session);
        } else {
          console.warn('⚠️ No tokens or code found in URL');
        }
      } catch (e) {
        console.error('OAuth callback error:', e.message);
      }
    };

    // Listen while app is already open
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Handle if app was launched from a deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'taskastic',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    // Open browser — the Linking listener above handles the token callback
    await WebBrowser.openBrowserAsync(data.url);
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
