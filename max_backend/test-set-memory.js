/**
 * Script pour configurer la mémoire tenant dans Supabase
 *
 * Test : Enregistrer les informations de l'utilisateur (nom, projet, etc.)
 */

import 'dotenv/config';
import { setTenantMemory } from './lib/maxLogger.js';

async function setUserMemory() {
  console.log('\n🧠 Configuration de la mémoire utilisateur dans Supabase...\n');

  const tenantId = 'macrea';

  // Informations utilisateur
  const memories = [
    {
      tenant_id: tenantId,
      memory_key: 'user_name',
      memory_value: 'Jules',
      memory_type: 'identity',
      scope: 'global',
      priority: 100,
      expires_at: null
    },
    {
      tenant_id: tenantId,
      memory_key: 'project_name',
      memory_value: 'Macrea CRM',
      memory_type: 'identity',
      scope: 'global',
      priority: 100,
      expires_at: null
    },
    {
      tenant_id: tenantId,
      memory_key: 'business_model',
      memory_value: 'Solution CRM SaaS pour PME',
      memory_type: 'business_context',
      scope: 'global',
      priority: 90,
      expires_at: null
    },
    {
      tenant_id: tenantId,
      memory_key: 'secteur',
      memory_value: 'Technologie / SaaS',
      memory_type: 'business_context',
      scope: 'global',
      priority: 90,
      expires_at: null
    }
  ];

  console.log('📝 Mémoires à enregistrer:');
  memories.forEach(m => {
    console.log(`   - ${m.memory_key}: ${m.memory_value}`);
  });
  console.log('');

  // Enregistrer chaque mémoire
  for (const memory of memories) {
    const result = await setTenantMemory(memory);

    if (result.ok) {
      console.log(`✅ [OK] ${memory.memory_key} enregistré`);
    } else {
      console.error(`❌ [ERREUR] ${memory.memory_key}: ${result.error}`);
    }
  }

  console.log('\n🎉 Configuration terminée!\n');
  console.log('Maintenant, quand vous discutez avec M.A.X., il se souviendra de:');
  console.log('   - Votre nom: Jules');
  console.log('   - Votre projet: Macrea CRM');
  console.log('   - Votre secteur: Technologie / SaaS\n');
}

setUserMemory()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
