/**
 * Script de vérification des tenants en DB
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTenants() {
  console.log('\n🔍 Vérification des tenants dans Supabase...\n');

  // 1. Vérifier les tenants dans message_events
  const { data: events, error: eventsError } = await supabase
    .from('message_events')
    .select('tenant_id')
    .limit(1000);

  if (eventsError) {
    console.error('❌ Erreur message_events:', eventsError);
  } else {
    const tenants = [...new Set(events.map(e => e.tenant_id))];
    console.log('📧 message_events - Tenants trouvés:', tenants);
    console.log('   Total events:', events.length);
  }

  // 2. Vérifier les tenants dans leads (si la table existe)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('tenant_id')
    .limit(1000);

  if (leadsError) {
    console.error('❌ Erreur leads:', leadsError.message);
  } else {
    const tenants = [...new Set(leads.map(l => l.tenant_id))];
    console.log('👥 leads - Tenants trouvés:', tenants);
    console.log('   Total leads:', leads.length);
  }

  // 3. Vérifier les users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email, tenant_id')
    .limit(100);

  if (usersError) {
    console.error('❌ Erreur users:', usersError.message);
  } else {
    console.log('👤 users - Trouvés:');
    users.forEach(u => {
      console.log(`   - ${u.email}: tenant_id = "${u.tenant_id}"`);
    });
  }

  console.log('\n✅ Vérification terminée\n');
}

checkTenants().catch(console.error);