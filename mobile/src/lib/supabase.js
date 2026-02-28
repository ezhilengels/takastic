import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://taskastic-proxy.ezhilengels12989.workers.dev';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZW5iZXFza3Rldm54d3ljcG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDU3MzYsImV4cCI6MjA4NzU4MTczNn0.fRPPzF1eMflDzfeEc9wKryEAnaVrxFEkiVur9H3gV8A';

// Test network on startup
fetch(`${SUPABASE_URL}/auth/v1/health`)
  .then(r => r.json())
  .then(d => console.log('✅ Proxy reachable:', JSON.stringify(d)))
  .catch(e => console.error('❌ Proxy NOT reachable:', e.message));

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: fetch.bind(globalThis),
  },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
