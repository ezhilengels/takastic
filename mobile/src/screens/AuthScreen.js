import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, ScrollView, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GREEN = '#00875A';

const googleLogoImg = require('../../assets/google-logo.png');

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode]         = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true); setError(null); setSuccessMsg(null);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true); setError(null); setSuccessMsg(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isSignIn = mode === 'signin';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={[styles.logoCircle, { backgroundColor: GREEN + '18', borderColor: GREEN + '40', borderWidth: 1.5 }]}>
              <Text style={[styles.logoIcon, { color: GREEN }]}>◈</Text>
            </View>
            <Text style={[styles.logoTitle, { color: GREEN }]}>Taskastic</Text>
            <Text style={[styles.logoSub, { color: theme.textMuted }]}>Stay focused. Get things done.</Text>
          </View>

          {/* Google Sign-In Button — official branding, always outside card */}
          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
            activeOpacity={0.9}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1F1F1F" size="small" />
            ) : (
              <>
                <Image source={googleLogoImg} style={{ width: 24, height: 24 }} />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider — always outside card */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isSignIn ? 'Sign In' : 'Create Account'}
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}
            {successMsg && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✅ {successMsg}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>EMAIL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                value={email} onChangeText={setEmail}
                placeholder="you@example.com" placeholderTextColor={theme.textMuted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textMuted }]}>PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.text }]}
                value={password} onChangeText={setPassword}
                placeholder="••••••••" placeholderTextColor={theme.textMuted}
                secureTextEntry autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit} disabled={loading || googleLoading} activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>{isSignIn ? 'Sign In' : 'Create Account'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => { setMode(isSignIn ? 'signup' : 'signin'); setError(null); setSuccessMsg(null); }}
            >
              <Text style={[styles.switchText, { color: theme.textMuted }]}>
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: GREEN, fontWeight: '700' }}>
                  {isSignIn ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea:     { alignItems: 'center', marginBottom: 36 },
  logoCircle:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon:     { fontSize: 36 },
  logoTitle:    { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  logoSub:      { fontSize: 14, marginTop: 6, fontWeight: '300', letterSpacing: 0.5 },
  card:         { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  cardTitle:    { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  errorBox:     { backgroundColor: '#E5484D18', borderWidth: 1, borderColor: '#E5484D44', borderRadius: 10, padding: 12 },
  errorText:    { color: '#E5484D', fontSize: 14 },
  successBox:   { backgroundColor: GREEN + '18', borderWidth: 1, borderColor: GREEN + '44', borderRadius: 10, padding: 12 },
  successText:  { color: GREEN, fontSize: 14, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#747775', borderRadius: 24,
    paddingVertical: 13, gap: 10, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', letterSpacing: 0.1 },

  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine:  { flex: 1, height: 1 },
  dividerText:  { fontSize: 12, fontWeight: '500' },

  fieldGroup:   { gap: 6 },
  label:        { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  input:        { borderWidth: 1.5, borderRadius: 10, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14 },
  submitBtn:    {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  switchBtn:    { alignItems: 'center', paddingVertical: 4 },
  switchText:   { fontSize: 14 },
});
