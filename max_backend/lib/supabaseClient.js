// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[SUPABASE] ⚠️  Configuration manquante - Supabase désactivé');
}

// Client Supabase avec service_role key (accès admin)
export const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper pour vérifier la connexion
export async function testSupabaseConnection() {
  if (!supabase) {
    return { ok: false, error: 'Supabase client not initialized' };
  }

  try {
    // Test simple : récupérer une table (même vide)
    const { error } = await supabase.from('max_sessions').select('count', { count: 'exact', head: true });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

console.log('[SUPABASE] Client initialisé:', SUPABASE_URL ? '✅' : '❌');
