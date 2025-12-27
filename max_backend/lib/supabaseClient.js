/**
 * supabaseClient.js
 * Client Supabase configuré pour le système d'alertes M.A.X.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service role key pour backend

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] ❌ Credentials manquants dans .env');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseKey ? '✓' : '✗');
  throw new Error('Supabase credentials manquants');
}

// Créer client Supabase avec service role (bypass RLS)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('[Supabase] ✅ Client initialisé:', supabaseUrl);

export default supabase;
