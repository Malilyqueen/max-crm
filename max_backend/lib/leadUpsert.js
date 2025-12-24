/**
 * leadUpsert.js
 * Logique d'upsert intelligente avec garde-fous
 * Évite la création de fiches vides
 */

import { espoFetch } from './espoClient.js';

/**
 * Valide qu'un lead a les champs minimums requis
 * @param {object} lead - Lead à valider
 * @returns {object} { valid: boolean, reason: string }
 */
export function validateMinimalLead(lead) {
  const hasEmail = lead.emailAddress && lead.emailAddress.trim() !== '';
  const hasName = lead.firstName && lead.lastName;
  const hasCompany = lead.accountName && lead.accountName.trim() !== '';

  // Règle : Email OU (Nom complet + Entreprise)
  if (hasEmail) {
    return { valid: true };
  }

  if (hasName && hasCompany) {
    return { valid: true };
  }

  // Lead invalide
  const reasons = [];
  if (!hasEmail) reasons.push('pas d\'email');
  if (!hasName) reasons.push('nom incomplet');
  if (!hasCompany) reasons.push('pas d\'entreprise');

  return {
    valid: false,
    reason: `Champs manquants : ${reasons.join(', ')}`
  };
}

/**
 * Cherche un lead existant par email, phone ou website
 * @param {object} lead - Lead à chercher
 * @returns {string|null} ID du lead trouvé, ou null
 */
export async function findExistingLead(lead) {
  // 1. Chercher par email (prioritaire)
  if (lead.emailAddress) {
    try {
      const response = await espoFetch('/Lead', {
        method: 'GET',
        params: {
          where: [
            {
              type: 'equals',
              attribute: 'emailAddress',
              value: lead.emailAddress
            }
          ],
          maxSize: 1
        }
      });

      if (response.list && response.list.length > 0) {
        console.log(`[Upsert] Lead trouvé par email: ${response.list[0].id}`);
        return response.list[0].id;
      }
    } catch (error) {
      console.error('[Upsert] Erreur recherche par email:', error.message);
    }
  }

  // 2. Chercher par téléphone
  if (lead.phoneNumber) {
    try {
      const response = await espoFetch('/Lead', {
        method: 'GET',
        params: {
          where: [
            {
              type: 'equals',
              attribute: 'phoneNumber',
              value: lead.phoneNumber
            }
          ],
          maxSize: 1
        }
      });

      if (response.list && response.list.length > 0) {
        console.log(`[Upsert] Lead trouvé par téléphone: ${response.list[0].id}`);
        return response.list[0].id;
      }
    } catch (error) {
      console.error('[Upsert] Erreur recherche par téléphone:', error.message);
    }
  }

  // 3. Chercher par website
  if (lead.website) {
    try {
      const response = await espoFetch('/Lead', {
        method: 'GET',
        params: {
          where: [
            {
              type: 'equals',
              attribute: 'website',
              value: lead.website
            }
          ],
          maxSize: 1
        }
      });

      if (response.list && response.list.length > 0) {
        console.log(`[Upsert] Lead trouvé par website: ${response.list[0].id}`);
        return response.list[0].id;
      }
    } catch (error) {
      console.error('[Upsert] Erreur recherche par website:', error.message);
    }
  }

  return null;
}

/**
 * Upsert intelligent : update si existe, create seulement avec confirmation
 * @param {object} lead - Lead à upserter
 * @param {object} options - Options { forceCreate: boolean }
 * @returns {object} { action: 'updated'|'created'|'skipped', id: string, reason: string }
 */
export async function upsertLead(lead, options = {}) {
  // Validation minimale
  const validation = validateMinimalLead(lead);
  if (!validation.valid) {
    console.log(`[Upsert] Lead invalide, skip: ${validation.reason}`);
    return {
      action: 'skipped',
      reason: validation.reason,
      lead: `${lead.firstName || ''} ${lead.lastName || ''} ${lead.emailAddress || ''}`.trim()
    };
  }

  // Chercher lead existant
  const existingId = await findExistingLead(lead);

  if (existingId) {
    // UPDATE
    try {
      await espoFetch(`/Lead/${existingId}`, {
        method: 'PUT',
        body: lead
      });

      console.log(`[Upsert] Lead mis à jour: ${existingId}`);
      return {
        action: 'updated',
        id: existingId,
        lead: `${lead.firstName} ${lead.lastName}`
      };
    } catch (error) {
      console.error(`[Upsert] Erreur update lead ${existingId}:`, error.message);
      return {
        action: 'skipped',
        reason: `Erreur update: ${error.message}`,
        lead: `${lead.firstName} ${lead.lastName}`
      };
    }
  } else {
    // CREATE (seulement si autorisé)
    if (!options.forceCreate) {
      console.log(`[Upsert] Lead non trouvé, création nécessite confirmation`);
      return {
        action: 'pending_confirmation',
        reason: 'Lead inexistant, confirmation requise pour créer',
        lead: `${lead.firstName} ${lead.lastName} (${lead.emailAddress || lead.phoneNumber})`
      };
    }

    // Créer
    try {
      const response = await espoFetch('/Lead', {
        method: 'POST',
        body: lead
      });

      console.log(`[Upsert] Lead créé: ${response.id}`);
      return {
        action: 'created',
        id: response.id,
        lead: `${lead.firstName} ${lead.lastName}`
      };
    } catch (error) {
      console.error('[Upsert] Erreur création lead:', error.message);
      return {
        action: 'skipped',
        reason: `Erreur création: ${error.message}`,
        lead: `${lead.firstName} ${lead.lastName}`
      };
    }
  }
}

/**
 * Upsert par lot avec rapport détaillé
 * @param {array} leads - Leads à upserter
 * @param {object} options - Options { forceCreate: boolean }
 * @returns {object} Rapport { updated, created, skipped, pendingConfirmation, details }
 */
export async function batchUpsertLeads(leads, options = {}) {
  const results = {
    updated: 0,
    created: 0,
    skipped: 0,
    pendingConfirmation: 0,
    details: []
  };

  for (const lead of leads) {
    const result = await upsertLead(lead, options);

    results.details.push(result);

    if (result.action === 'updated') {
      results.updated++;
    } else if (result.action === 'created') {
      results.created++;
    } else if (result.action === 'pending_confirmation') {
      results.pendingConfirmation++;
    } else if (result.action === 'skipped') {
      results.skipped++;
    }
  }

  return results;
}
