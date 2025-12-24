/**
 * whatsappVariableMapper.js
 * Mapping automatique des variables WhatsApp depuis les données EspoCRM
 */

import { format, parse, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Mappe automatiquement les variables d'un template WhatsApp depuis un lead EspoCRM
 * @param {Object} lead - Lead EspoCRM
 * @param {Array<string>} variableNames - Noms des variables attendues par le template
 * @returns {Object} - Variables mappées {prenom: "Jean", date: "15/12/2025", ...}
 */
export function mapVariablesFromLead(lead, variableNames) {
  const variables = {};

  for (const varName of variableNames) {
    const normalizedVar = varName.toLowerCase().trim();

    switch (normalizedVar) {
      // === INFORMATIONS PERSONNELLES ===
      case 'prenom':
      case 'firstname':
        variables[varName] = lead.firstName || lead.name?.split(' ')[0] || '';
        break;

      case 'nom':
      case 'lastname':
        variables[varName] = lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '';
        break;

      case 'nom_complet':
      case 'fullname':
      case 'name':
        variables[varName] = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        break;

      case 'email':
      case 'emailaddress':
        variables[varName] = lead.emailAddress || '';
        break;

      case 'telephone':
      case 'phone':
      case 'phonenumber':
        variables[varName] = lead.phoneNumber || '';
        break;

      case 'entreprise':
      case 'company':
      case 'accountname':
        variables[varName] = lead.accountName || '';
        break;

      // === DATES ET HEURES (RDV, Meetings) ===
      case 'date':
      case 'date_rdv':
      case 'datestart':
        if (lead.dateStart) {
          variables[varName] = formatDate(lead.dateStart);
        } else if (lead.nextMeeting?.dateStart) {
          variables[varName] = formatDate(lead.nextMeeting.dateStart);
        } else {
          variables[varName] = '';
        }
        break;

      case 'heure':
      case 'time':
      case 'hour':
        if (lead.dateStart) {
          variables[varName] = formatTime(lead.dateStart);
        } else if (lead.nextMeeting?.dateStart) {
          variables[varName] = formatTime(lead.nextMeeting.dateStart);
        } else {
          variables[varName] = '';
        }
        break;

      case 'date_complete':
      case 'datetime':
        if (lead.dateStart) {
          variables[varName] = formatDateTime(lead.dateStart);
        } else if (lead.nextMeeting?.dateStart) {
          variables[varName] = formatDateTime(lead.nextMeeting.dateStart);
        } else {
          variables[varName] = '';
        }
        break;

      // === E-COMMERCE / PANIER ===
      case 'produits':
      case 'products':
      case 'items':
        // Peut venir d'un champ custom ou d'une relation
        variables[varName] = lead.produits || lead.products || '';
        break;

      case 'montant':
      case 'amount':
      case 'total':
      case 'price':
        variables[varName] = lead.montant || lead.amount || lead.opportunityAmount || '';
        break;

      case 'reduction':
      case 'discount':
      case 'promo':
        variables[varName] = lead.reduction || lead.discount || '';
        break;

      case 'date_limite':
      case 'deadline':
      case 'expiry':
        variables[varName] = lead.dateLimite ? formatDate(lead.dateLimite) : '';
        break;

      // === STATUT / SUIVI ===
      case 'statut':
      case 'status':
        variables[varName] = lead.status || '';
        break;

      case 'source':
        variables[varName] = lead.source || '';
        break;

      case 'prochaine_action':
      case 'nextaction':
      case 'prochaineaction':
        variables[varName] = lead.prochaineAction || lead.nextAction || '';
        break;

      // === CHAMPS PERSONNALISÉS (MACREA CORE) ===
      case 'secteur':
      case 'secteurinfere':
      case 'sector':
        variables[varName] = lead.secteurInfere || lead.secteur || '';
        break;

      case 'objectifs':
      case 'objectifsclient':
      case 'goals':
        variables[varName] = lead.objectifsClient || lead.objectifs || '';
        break;

      case 'services':
      case 'servicessouhaites':
        variables[varName] = lead.servicesSouhaites || lead.services || '';
        break;

      case 'notes':
      case 'notesia':
        variables[varName] = lead.notesIA || lead.description || '';
        break;

      case 'score':
      case 'scoreia':
        variables[varName] = lead.scoreIA?.toString() || '';
        break;

      // === FALLBACK: Chercher directement dans le lead ===
      default:
        // Essayer de trouver le champ directement dans le lead
        if (lead[varName]) {
          variables[varName] = lead[varName];
        } else if (lead[normalizedVar]) {
          variables[varName] = lead[normalizedVar];
        } else {
          // Chercher en camelCase
          const camelCaseVar = toCamelCase(varName);
          variables[varName] = lead[camelCaseVar] || '';
        }
        break;
    }
  }

  return variables;
}

/**
 * Formate une date ISO en format français lisible
 * @param {string} isoDate - Date au format ISO
 * @returns {string} - Date formatée (ex: "15/12/2025" ou "15 décembre 2025")
 */
export function formatDate(isoDate, longFormat = false) {
  if (!isoDate) return '';
  try {
    const date = parseISO(isoDate);
    if (longFormat) {
      return format(date, 'd MMMM yyyy', { locale: fr });
    }
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    console.error('[formatDate] Erreur formatage date:', error);
    return '';
  }
}

/**
 * Formate une heure ISO en format français
 * @param {string} isoDate - Date ISO avec heure
 * @returns {string} - Heure formatée (ex: "14h30")
 */
export function formatTime(isoDate) {
  if (!isoDate) return '';
  try {
    const date = parseISO(isoDate);
    return format(date, 'HH\\hmm', { locale: fr });
  } catch (error) {
    console.error('[formatTime] Erreur formatage heure:', error);
    return '';
  }
}

/**
 * Formate une date+heure ISO en format complet
 * @param {string} isoDate - Date ISO
 * @returns {string} - Date+heure formatée (ex: "Vendredi 15 décembre 2025 à 14h30")
 */
export function formatDateTime(isoDate) {
  if (!isoDate) return '';
  try {
    const date = parseISO(isoDate);
    return format(date, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  } catch (error) {
    console.error('[formatDateTime] Erreur formatage date/heure:', error);
    return '';
  }
}

/**
 * Convertit une chaîne en camelCase
 * @param {string} str - Chaîne à convertir
 * @returns {string} - Chaîne en camelCase
 */
function toCamelCase(str) {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

/**
 * Résout un lead par ID ou par nom
 * @param {string} identifier - ID du lead ou nom complet
 * @param {Function} espoFetch - Fonction pour appeler l'API EspoCRM
 * @returns {Object|null} - Lead trouvé ou null
 */
export async function resolveLeadIdentifier(identifier, espoFetch) {
  // Cas 1: C'est un ID EspoCRM (format UUID)
  if (/^[0-9a-f]{17}$/i.test(identifier)) {
    try {
      const params = new URLSearchParams({
        select: 'id,name,firstName,lastName,phoneNumber,emailAddress,accountName,status,dateStart,opportunityAmount,secteurInfere,secteur,objectifsClient,servicesSouhaites,notesIA,description,scoreIA,source'
      });
      const lead = await espoFetch(`/Lead/${identifier}?${params.toString()}`);
      console.log(`[resolveLeadIdentifier] Lead récupéré par ID:`, JSON.stringify(lead, null, 2));
      return lead;
    } catch (error) {
      console.error(`[resolveLeadIdentifier] Lead ${identifier} introuvable:`, error.message);
      return null;
    }
  }

  // Cas 2: C'est un nom complet, chercher par nom
  try {
    // Recherche par nom (firstName + lastName contient le nom)
    const searchParams = new URLSearchParams({
      where: JSON.stringify([
        {
          type: 'or',
          value: [
            {
              type: 'contains',
              attribute: 'name',
              value: identifier
            },
            {
              type: 'contains',
              attribute: 'accountName',
              value: identifier
            }
          ]
        }
      ]),
      select: 'id,name,firstName,lastName,phoneNumber,emailAddress,accountName,status,dateStart,opportunityAmount,secteurInfere,secteur,objectifsClient,servicesSouhaites,notesIA,description,scoreIA,source',
      maxSize: 1
    });

    const response = await espoFetch(`/Lead?${searchParams.toString()}`);
    if (response.list && response.list.length > 0) {
      console.log(`[resolveLeadIdentifier] Lead récupéré par NOM:`, JSON.stringify(response.list[0], null, 2));
      return response.list[0];
    }

    console.warn(`[resolveLeadIdentifier] Aucun lead trouvé pour "${identifier}"`);
    return null;
  } catch (error) {
    console.error(`[resolveLeadIdentifier] Erreur recherche lead "${identifier}":`, error.message);
    return null;
  }
}

/**
 * Génère un payload encodé pour les templates CTA (panier abandonné, etc.)
 * @param {Object} data - Données à encoder
 * @returns {string} - Payload encodé en base64url
 */
export function generatePayload(data) {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Prépare les variables pour un message Quick Reply (avec leadId et tenantId)
 * @param {Object} lead - Lead EspoCRM
 * @param {Array<string>} variableNames - Variables du template
 * @param {string} tenantId - ID du tenant
 * @returns {Object} - Variables avec leadId et tenantId ajoutés
 */
export function prepareQuickReplyVariables(lead, variableNames, tenantId) {
  const baseVariables = mapVariablesFromLead(lead, variableNames);

  // Ajouter leadId et tenantId pour les boutons Quick Reply
  return {
    ...baseVariables,
    leadId: lead.id,
    tenantId: tenantId || 'macrea'
  };
}

/**
 * Prépare les variables pour un message CTA (avec payload encodé)
 * @param {Object} lead - Lead EspoCRM
 * @param {Array<string>} variableNames - Variables du template
 * @param {Object} payloadData - Données supplémentaires pour le payload
 * @returns {Object} - Variables avec payload encodé
 */
export function prepareCtaVariables(lead, variableNames, payloadData = {}) {
  const baseVariables = mapVariablesFromLead(lead, variableNames);

  // Générer le payload pour l'URL
  const payload = generatePayload({
    leadId: lead.id,
    tenantId: payloadData.tenantId || 'macrea',
    cartToken: payloadData.cartToken || `cart_${lead.id}_${Date.now()}`,
    ...payloadData
  });

  return {
    ...baseVariables,
    payload
  };
}
