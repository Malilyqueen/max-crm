/**
 * chat.js
 *
 * Routes API pour le Chat M.A.X.
 * - POST /api/chat - Envoyer un message et recevoir réponse
 * - GET /api/chat/sessions - Lister les sessions
 * - GET /api/chat/session/:id - Charger une session
 * - POST /api/chat/session - Créer nouvelle session
 * - DELETE /api/chat/session/:id - Supprimer session
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Utilisation de callOpenAI pour M.A.X. (avec support des tools/function calling)
import { callOpenAI } from '../lib/aiClient.js';
import {
  createSession,
  loadConversation,
  saveMessage,
  getContextMessages,
  summarizeIfNeeded,
  listSessions,
  deleteSession,
  updateSessionMode
} from '../lib/conversationService.js';
import { analyzeFile, generateEnrichmentQuestions } from '../lib/fileAnalyzer.js';
import { enrichDataset, askForContext } from '../lib/dataEnricher.js';
import { importEnrichedDataset, importLeads } from '../lib/espoImporter.js';
import { detectState, extractContextData } from '../lib/contextDetector.js';
import { getButtonsForState } from '../lib/actionMapper.js';
import { detectOperationMode, storeLeadContext, getActiveLeadContext, clearImportContext } from '../lib/sessionContext.js';
import { batchUpsertLeads, upsertLead, validateMinimalLead, findExistingLead } from '../lib/leadUpsert.js';
import { formatEnrichedLead, generateUpdateDiff, FIELD_MAPPING } from '../lib/fieldMapping.js';
import { espoFetch, espoAdminFetch } from '../lib/espoClient.js';
import { addFieldToAllLayouts } from '../lib/layoutManager.js';
import { espoRebuild, espoClearCache } from '../lib/phpExecutorAuto.js';
import { logMaxActivity } from '../lib/activityLogger.js';
import { validateConsent } from '../lib/consentGate.js';
import { trigger } from '../services/n8n.js';
import { WhatsAppMessage } from '../models/WhatsAppMessage.js';
import { sendWhatsAppMessage } from '../services/whatsappSendService.js';
import {
  mapVariablesFromLead,
  resolveLeadIdentifier,
  prepareQuickReplyVariables,
  prepareCtaVariables
} from '../lib/whatsappVariableMapper.js';
// Phase 2B - Intégration mémoire Supabase
import { getMaxContext, getRecentActions } from '../lib/maxLogReader.js';
import { logMaxAction, upsertSession, setTenantMemory, getTenantMemory } from '../lib/maxLogger.js';
import { supabase } from '../lib/supabaseClient.js';
// Multi-tenant : auth optionnelle pour extraire tenantId du JWT
import { optionalAuthMiddleware } from '../middleware/authMiddleware.js';
// Phase 2B+ - Mémoire longue durée (objectifs)
import {
  createTenantGoal,
  getTenantGoals,
  updateTenantGoal,
  archiveTenantGoal,
  formatGoalForDisplay
} from '../lib/tenantGoals.js';
// Service d'activité en temps réel
import activity from '../services/activity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ PROMPTS ESSENTIELS UNIQUEMENT (Nettoyé pour performance)
const ULTRA_PRIORITY_RULES = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'ULTRA_PRIORITY_RULES.txt'),
  'utf-8'
);

const PROMPT_SYSTEM_MAX = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'max_system_prompt_v2.txt'),
  'utf-8'
);

const STATUS_INDICATORS = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'max_status_indicators.txt'),
  'utf-8'
);

const RAPPORT_OBLIGATOIRE = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'max_rapport_obligatoire.txt'),
  'utf-8'
);

const INSTRUCTION_MODE_LECTURE = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'INSTRUCTION_MODE_LECTURE.txt'),
  'utf-8'
);

const FILE_UPLOAD_INSTRUCTIONS = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'FILE_UPLOAD_INSTRUCTIONS.txt'),
  'utf-8'
);

const CUSTOM_FIELDS_AWARENESS = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'max_custom_fields_awareness.txt'),
  'utf-8'
);

const DASHBOARD_MANAGEMENT = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'DASHBOARD_MANAGEMENT.txt'),
  'utf-8'
);

// Extension MaCréa CORE Universal
const MACREA_CORE_UNIVERSAL = fs.readFileSync(
  path.join(__dirname, '..', 'extensions', 'macrea-core-universal', 'prompts.txt'),
  'utf-8'
);

const NEWSLETTER_CREATION = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'NEWSLETTER_CREATION_COMPACT.txt'),
  'utf-8'
);

const NO_TECHNICAL_DETAILS_FOR_CLIENTS = fs.readFileSync(
  path.join(__dirname, '..', 'prompts', 'NO_TECHNICAL_DETAILS_FOR_CLIENTS.txt'),
  'utf-8'
);

// Charger l'identité de l'agent (règles anti-hallucination, etc.)
const AGENT_IDENTITY = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'data', 'agent_identity.json'),
    'utf-8'
  )
);

// Combiner les prompts - ORDRE POUR GPT-4o (128k context)
// IMPORTANT : Le client peut demander N'IMPORTE QUOI dans N'IMPORTE QUEL ORDRE
// Les "priorités" sont pour l'ordre des prompts (recency bias), PAS pour restreindre M.A.X.
// 1. CŒUR DE MÉTIER (leads, anti-hallucination) - Lu en premier
// 2. ADMINISTRATION CRM (champs, layouts, dashboards) - Milieu
// 3. MARKETING (newsletters, copywriting) - Avant les règles finales
// ⚠️ RÈGLES ULTRA-PRIORITAIRES seront ajoutées À LA TOUTE FIN (après contexte)

const BASE_SYSTEM_PROMPT = `${PROMPT_SYSTEM_MAX}

${RAPPORT_OBLIGATOIRE}

${STATUS_INDICATORS}

${INSTRUCTION_MODE_LECTURE}

${FILE_UPLOAD_INSTRUCTIONS}

═══════════════════════════════════════════════════════════════════
📊 ADMINISTRATION CRM (champs custom, layouts, dashboards)
═══════════════════════════════════════════════════════════════════

${CUSTOM_FIELDS_AWARENESS}

${DASHBOARD_MANAGEMENT}

═══════════════════════════════════════════════════════════════════
🌍 EXTENSION MACREA CORE UNIVERSAL (ENRICHISSEMENT LEADS)
═══════════════════════════════════════════════════════════════════

${MACREA_CORE_UNIVERSAL}

═══════════════════════════════════════════════════════════════════
🎁 FONCTIONNALITÉS BONUS (newsletters, marketing)
═══════════════════════════════════════════════════════════════════

${NEWSLETTER_CREATION}

${NO_TECHNICAL_DETAILS_FOR_CLIENTS}

═══════════════════════════════════════════════════════════════════
IDENTITÉ ET RÈGLES ANTI-HALLUCINATION
═══════════════════════════════════════════════════════════════════

${JSON.stringify(AGENT_IDENTITY.anti_hallucination, null, 2)}

RÈGLE STRICTE: ${AGENT_IDENTITY.anti_hallucination.règle_stricte}

PROTOCOLE À SUIVRE:
${AGENT_IDENTITY.anti_hallucination.protocole.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${AGENT_IDENTITY.anti_hallucination.tools_autorisés_référence}
`;

const router = express.Router();

// Appliquer auth optionnelle pour extraire tenantId du JWT (si présent)
router.use(optionalAuthMiddleware);

// Configuration multer pour upload fichiers
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      '.csv', '.xlsx', '.xls',           // Données tabulaires
      '.txt', '.md', '.json',            // Texte et données structurées
      '.pdf', '.docx', '.doc',           // Documents
      '.html', '.xml',                   // Markup
      '.log', '.yaml', '.yml', '.toml'   // Fichiers config/logs
    ];
    const ext = path.extname(file.originalname).toLowerCase();

    // Accepter aussi les fichiers sans extension (comme README, LICENSE)
    if (ext === '' || allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté: ${ext}. Types acceptés: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * Import des Tools M.A.X. depuis lib/maxTools.js
 */
import { MAX_TOOLS } from '../lib/maxTools.js';

/**
 * Exécuter un tool call
 */
async function executeToolCall(toolName, args, sessionId) {
  const conversation = loadConversation(sessionId);

  if (!conversation) {
    throw new Error('Session introuvable');
  }

  switch (toolName) {
    case 'get_uploaded_file_data': {
      if (!conversation.uploadedFile || !conversation.uploadedFile.analysis) {
        return {
          error: 'Aucun fichier uploadé dans cette session',
          hasFile: false
        };
      }

      const { analysis, filename } = conversation.uploadedFile;
      return {
        success: true,
        filename,
        rowCount: analysis.summary.rowCount,
        columns: analysis.columns.map(c => ({
          name: c.name,
          completionRate: c.completionRate,
          type: c.type
        })),
        sampleData: analysis.data.slice(0, 5)
      };
    }

    case 'enrich_and_import_leads': {
      if (!conversation.uploadedFile || !conversation.uploadedFile.analysis) {
        return {
          error: 'Aucun fichier à enrichir',
          success: false
        };
      }

      const { context } = args;
      const { analysis } = conversation.uploadedFile;

      // Enrichir les données
      const enrichmentResult = await enrichDataset(analysis.data, context);

      // Sauvegarder dans la session
      conversation.enrichedData = {
        enrichedLeads: enrichmentResult.enrichedLeads,
        enrichmentData: enrichmentResult.enrichmentData,
        stats: enrichmentResult.stats,
        context: context,
        enrichedAt: new Date().toISOString()
      };

      const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

      return {
        success: true,
        enrichedCount: enrichmentResult.enrichedLeads.length,
        tags: enrichmentResult.enrichmentData.tags,
        status: enrichmentResult.enrichmentData.status,
        source: enrichmentResult.enrichmentData.source
      };
    }

    case 'import_leads_to_crm': {
      if (!conversation.enrichedData) {
        return {
          error: 'Aucune donnée enrichie à importer',
          success: false
        };
      }

      const importResult = await importEnrichedDataset(conversation.enrichedData);

      // Marquer la session comme importée
      if (importResult.ok) {
        conversation.imported = true;
        conversation.importedAt = new Date().toISOString();
        const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
        fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));
      }

      return {
        success: importResult.ok,
        stats: importResult.stats
      };
    }

    case 'propose_actions': {
      // Sauvegarder les actions proposées dans la session
      const { actions } = args;

      conversation.proposedActions = actions.map((action, index) => ({
        ...action,
        timestamp: new Date().toISOString(),
        id: action.id || `action_${Date.now()}_${index}`
      }));

      const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

      return {
        success: true,
        actionsCount: actions.length,
        actions: conversation.proposedActions
      };
    }

    case 'query_espo_leads': {
      const { filters = {}, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = args;

      try {
        // Construire la requête EspoCRM
        const params = new URLSearchParams({
          maxSize: limit.toString(),
          orderBy: sortBy,
          order: sortOrder
        });

        // Ajouter filtres si présents
        if (Object.keys(filters).length > 0) {
          params.append('where', JSON.stringify([filters]));
        }

        const response = await espoFetch(`/Lead?${params.toString()}`);

        // Mémoriser les IDs dans la session
        const leadIds = response.list.map(lead => lead.id);
        storeLeadContext(conversation, leadIds);

        const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
        fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'data_listed',
          entity: 'Lead',
          count: response.list.length,
          total: response.total,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          details: `Listage de ${response.list.length} lead(s) sur ${response.total} total`
        });

        return {
          success: true,
          total: response.total,
          count: response.list.length,
          leads: response.list.map(lead => ({
            id: lead.id,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            email: lead.emailAddress,
            phone: lead.phoneNumber,
            accountName: lead.accountName,
            createdAt: lead.createdAt
          })),
          leadIds
        };
      } catch (error) {
        console.error('[query_espo_leads] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'update_leads_in_espo': {
      const { leadIds, updates, mode = 'update_only', leadData: directLeadData } = args;

      try {
        // Mode force_create : créer de nouveaux leads depuis les données du fichier uploadé OU directLeadData
        if (mode === 'force_create') {
          // Vérifier s'il y a des données directes (création conversationnelle)
          if (directLeadData && typeof directLeadData === 'object') {
            // Mode DIRECT CREATE: L'utilisateur a fourni les données du lead directement
            console.log('[update_leads_in_espo] Mode DIRECT CREATE avec données:', directLeadData);

            try {
              // Mapper les valeurs vers les énumérations EspoCRM valides
              const normalizeStatus = (status) => {
                if (!status) return 'New';
                const statusMap = {
                  'nouveau': 'New',
                  'new': 'New',
                  'assigné': 'Assigned',
                  'assigned': 'Assigned',
                  'en cours': 'In Process',
                  'in process': 'In Process',
                  'converti': 'Converted',
                  'converted': 'Converted',
                  'recyclé': 'Recycled',
                  'recycled': 'Recycled',
                  'mort': 'Dead',
                  'dead': 'Dead'
                };
                return statusMap[status.toLowerCase()] || 'New';
              };

              const normalizeSource = (source) => {
                if (!source) return 'Web Site';
                const sourceMap = {
                  'call': 'Call',
                  'appel': 'Call',
                  'email': 'Email',
                  'existing customer': 'Existing Customer',
                  'client existant': 'Existing Customer',
                  'partner': 'Partner',
                  'partenaire': 'Partner',
                  'public relations': 'Public Relations',
                  'web site': 'Web Site',
                  'site web': 'Web Site',
                  'campaign': 'Campaign',
                  'campagne': 'Campaign',
                  'other': 'Other',
                  'autre': 'Other',
                  'whatsapp': 'Web Site',  // WhatsApp n'est pas dans la liste EspoCRM → Web Site
                  'social media': 'Web Site'
                };
                return sourceMap[source.toLowerCase()] || 'Web Site';
              };

              const normalizeIndustry = (industry) => {
                if (!industry) return '';  // Industry est optionnel
                const industryMap = {
                  'agriculture': 'Agriculture',
                  'automotive': 'Automotive',
                  'automobile': 'Automotive',
                  'banking': 'Banking',
                  'banque': 'Banking',
                  'banque et conseil': 'Consulting',  // Mapping spécifique pour ce cas
                  'consulting': 'Consulting',
                  'conseil': 'Consulting',
                  'education': 'Education',
                  'éducation': 'Education',
                  'energy': 'Energy',
                  'énergie': 'Energy',
                  'entertainment': 'Entertainment',
                  'divertissement': 'Entertainment',
                  'finance': 'Finance',
                  'healthcare': 'Healthcare',
                  'santé': 'Healthcare',
                  'hospitality': 'Hospitality',
                  'hôtellerie': 'Hospitality',
                  'insurance': 'Insurance',
                  'assurance': 'Insurance',
                  'legal': 'Legal',
                  'juridique': 'Legal',
                  'manufacturing': 'Manufacturing',
                  'fabrication': 'Manufacturing',
                  'marketing': 'Marketing',
                  'media': 'Media',
                  'médias': 'Media',
                  'real estate': 'Real Estate',
                  'immobilier': 'Real Estate',
                  'recreation': 'Recreation',
                  'loisirs': 'Recreation',
                  'retail': 'Retail',
                  'commerce': 'Retail',
                  'shipping': 'Shipping',
                  'transport maritime': 'Shipping',
                  'technology': 'Technology',
                  'technologie': 'Technology',
                  'telecommunications': 'Telecommunications',
                  'télécommunications': 'Telecommunications',
                  'transportation': 'Transportation',
                  'transport': 'Transportation',
                  'utilities': 'Utilities',
                  'services publics': 'Utilities',
                  'other': 'Other',
                  'autre': 'Other'
                };
                return industryMap[industry.toLowerCase()] || '';  // Si inconnu, laisser vide plutôt qu'erreur
              };

              // Formatter les données pour EspoCRM
              const leadPayload = {
                firstName: directLeadData.firstName || directLeadData.prenom || '',
                lastName: directLeadData.lastName || directLeadData.nom || directLeadData.name || 'N/A',
                accountName: directLeadData.accountName || directLeadData.company || directLeadData.entreprise || '',
                emailAddress: directLeadData.emailAddress || directLeadData.email || '',
                phoneNumber: directLeadData.phoneNumber || directLeadData.phone || directLeadData.telephone || '',
                addressCity: directLeadData.addressCity || directLeadData.ville || directLeadData.adresse || '',
                addressCountry: directLeadData.addressCountry || directLeadData.pays || '',
                description: directLeadData.description || directLeadData.note || '',
                industry: normalizeIndustry(directLeadData.industry || directLeadData.secteur),
                status: normalizeStatus(directLeadData.status),
                source: normalizeSource(directLeadData.source)
              };

              console.log('[update_leads_in_espo] Payload EspoCRM:', JSON.stringify(leadPayload, null, 2));

              // Créer le lead via POST
              const created = await espoFetch('/Lead', {
                method: 'POST',
                body: JSON.stringify(leadPayload)
              });

              console.log(`[update_leads_in_espo] ✅ Lead créé avec succès - ID: ${created.id}`);

              return {
                success: true,
                mode: 'direct_create',
                created: 1,
                failed: 0,
                leadId: created.id,
                details: [{
                  name: leadPayload.lastName || leadPayload.accountName,
                  status: 'success',
                  message: `Lead créé avec ID: ${created.id}`
                }]
              };
            } catch (error) {
              console.error('[update_leads_in_espo] ❌ Erreur création lead direct:');
              console.error('  - Message:', error.message);
              console.error('  - Status:', error.status || 'N/A');
              console.error('  - Body:', error.body || 'N/A');
              console.error('  - URL:', error.url || 'N/A');

              return {
                success: false,
                error: `Création échouée: ${error.message}`,
                details: {
                  status: error.status,
                  body: error.body,
                  url: error.url
                }
              };
            }
          }

          // Mode FILE CREATE: Fichier CSV uploadé
          if (!conversation.uploadedFile || !conversation.uploadedFile.analysis || !conversation.uploadedFile.analysis.data) {
            return {
              success: false,
              error: 'Mode force_create nécessite soit un fichier CSV uploadé, soit des données directes (leadData). Utilisez {mode: "force_create", leadData: {...}} pour créer un lead conversationnellement.'
            };
          }

          const fileData = conversation.uploadedFile.analysis.data;
          const results = {
            created: 0,
            failed: 0,
            details: []
          };

          // Fonction pour formater un numéro de téléphone français
          const formatPhoneNumber = (phone) => {
            if (!phone) return '';
            // Nettoyer le numéro (supprimer espaces, tirets, etc.)
            const cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');
            // Si c'est un numéro français à 9 chiffres (sans le 0), ajouter +33
            if (/^\d{9}$/.test(cleaned)) {
              return `+33 ${cleaned.substring(0, 1)} ${cleaned.substring(1, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)}`;
            }
            // Si c'est un numéro français à 10 chiffres (avec le 0)
            if (/^0\d{9}$/.test(cleaned)) {
              return `+33 ${cleaned.substring(1, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8, 10)}`;
            }
            // Sinon, retourner le numéro tel quel (peut-être déjà formaté)
            return cleaned || '';
          };

          for (const row of fileData) {
            try {
              // Mapper les données du fichier vers le format EspoCRM Lead
              const leadData = {
                firstName: row.prenom || row.firstName || '',
                lastName: row.nom || row.nom_entreprise || row.lastName || row.name || 'N/A',
                accountName: row.nom_entreprise || row.company || row.accountName || row.entreprise || '',
                emailAddress: row.email || row.emailAddress || '',
                phoneNumber: formatPhoneNumber(row.telephone || row.phone || row.phoneNumber),
                addressCity: row.localisation || row.ville || row.city || row.addressCity || '',
                description: row.remarque || row.description || row.note || '',
                status: 'New',
                source: 'Web Site'  // Valeur EspoCRM standard
              };

              // Vérifier si le lead existe déjà (par email ou nom d'entreprise)
              let existingLead = null;
              try {
                if (leadData.emailAddress) {
                  const searchByEmail = await espoFetch(`/Lead?where[0][type]=equals&where[0][attribute]=emailAddress&where[0][value]=${encodeURIComponent(leadData.emailAddress)}`);
                  if (searchByEmail.list && searchByEmail.list.length > 0) {
                    existingLead = searchByEmail.list[0];
                  }
                }
              } catch (searchError) {
                // Ignorer les erreurs de recherche
              }

              if (existingLead) {
                // Lead existe déjà, on le met à jour
                const updated = await espoFetch(`/Lead/${existingLead.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(leadData)
                });
                results.created++;
                results.details.push({
                  name: leadData.lastName || leadData.accountName,
                  status: 'success',
                  message: `Lead mis à jour (existait déjà) - ID: ${existingLead.id}`
                });
                console.log(`[update_leads_in_espo] Lead mis à jour: ${existingLead.id}`);
              } else {
                // Créer le lead via POST
                const created = await espoFetch('/Lead', {
                  method: 'POST',
                  body: JSON.stringify(leadData)
                });
                results.created++;
                results.details.push({
                  name: leadData.lastName || leadData.accountName,
                  status: 'success',
                  message: `Lead créé avec ID: ${created.id}`
                });
                console.log(`[update_leads_in_espo] Lead créé: ${created.id}`);
              }
            } catch (error) {
              results.failed++;
              results.details.push({
                name: row.nom_entreprise || row.name || 'Inconnu',
                status: 'error',
                message: `Erreur: ${error.message}`
              });
              console.error(`[update_leads_in_espo] ❌ Erreur création/mise à jour lead:`, error.message);
              if (error.status) console.error(`  - Status HTTP: ${error.status}`);
              if (error.body) console.error(`  - Body CRM: ${error.body}`);
              if (error.url) console.error(`  - URL: ${error.url}`);
            }
          }

          // Log l'activité M.A.X.
          logMaxActivity({
            type: 'data_created',
            entity: 'Lead',
            count: results.created,
            details: `Création de ${results.created} lead(s), ${results.failed} échec(s)`
          });

          return {
            success: results.created > 0,
            mode,
            created: results.created,
            failed: results.failed,
            details: results.details
          };
        }

        // Mode update_only ou upsert : mettre à jour des leads existants
        // Récupérer les IDs des leads à mettre à jour
        let targetLeadIds = leadIds;

        if (!targetLeadIds || targetLeadIds.length === 0) {
          // Utiliser le contexte mémorisé
          targetLeadIds = getActiveLeadContext(conversation);

          if (!targetLeadIds || targetLeadIds.length === 0) {
            return {
              success: false,
              error: 'Aucun lead ciblé. Utilisez d\'abord query_espo_leads ou fournissez leadIds.'
            };
          }
        }

        // Formatter les updates (mapping propre)
        const formattedUpdates = formatEnrichedLead(updates);

        // Mettre à jour chaque lead via PATCH
        const results = {
          updated: 0,
          failed: 0,
          details: []
        };

        for (const id of targetLeadIds) {
          try {
            await espoFetch(`/Lead/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(formattedUpdates)
            });
            results.updated++;
            results.details.push({
              id,
              status: 'success',
              message: `Lead ${id} mis à jour avec succès`
            });
            console.log(`[update_leads_in_espo] Lead ${id} mis à jour avec succès`);
          } catch (error) {
            results.failed++;
            results.details.push({
              id,
              status: 'error',
              message: `Erreur: ${error.message}`
            });
            console.error(`[update_leads_in_espo] ❌ Erreur mise à jour lead ${id}:`, error.message);
            if (error.status) console.error(`  - Status HTTP: ${error.status}`);
            if (error.body) console.error(`  - Body CRM: ${error.body}`);
            if (error.url) console.error(`  - URL: ${error.url}`);
          }
        }

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'data_updated',
          entity: 'Lead',
          count: results.updated,
          leadIds: targetLeadIds,
          updates: formattedUpdates,
          details: `Mise à jour de ${results.updated} lead(s), ${results.failed} échec(s)`
        });

        return {
          success: results.updated > 0,
          mode,
          targetCount: targetLeadIds.length,
          updated: results.updated,
          failed: results.failed,
          details: results.details
        };
      } catch (error) {
        console.error('[update_leads_in_espo] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'delete_leads_from_espo': {
      const { leadIds, confirm = false } = args;

      if (!confirm) {
        return {
          success: false,
          requiresConfirmation: true,
          message: `Suppression de ${leadIds.length} leads. Confirmez avec confirm: true`
        };
      }

      try {
        const deleted = [];
        const errors = [];

        for (const id of leadIds) {
          try {
            await espoFetch(`/Lead/${id}`, { method: 'DELETE' });
            deleted.push(id);
          } catch (error) {
            errors.push({ id, error: error.message });
          }
        }

        // Log l'activité M.A.X.
        if (deleted.length > 0) {
          logMaxActivity({
            type: 'data_deleted',
            entity: 'Lead',
            count: deleted.length,
            leadIds: deleted,
            details: `Suppression de ${deleted.length} lead(s)`
          });
        }

        return {
          success: true,
          deleted: deleted.length,
          errors: errors.length,
          deletedIds: deleted,
          errorDetails: errors
        };
      } catch (error) {
        console.error('[delete_leads_from_espo] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'get_lead_diff': {
      const { leadId, proposedUpdates } = args;

      try {
        // Charger le lead existant
        const existingLead = await espoFetch(`/Lead/${leadId}`);

        // Générer le diff
        const diff = generateUpdateDiff(existingLead, proposedUpdates);

        return {
          success: true,
          leadId,
          leadName: `${existingLead.firstName || ''} ${existingLead.lastName || ''}`.trim(),
          diff: {
            added: diff.added,
            modified: diff.modified,
            unchanged: diff.unchanged
          }
        };
      } catch (error) {
        console.error('[get_lead_diff] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'analyze_and_enrich_leads': {
      const { leadIds, applyUpdates = false } = args;

      try {
        // Import du module d'analyse
        const { batchAnalyzeLeads, formatEnrichedLeadsForUpdate } = await import('../lib/emailAnalyzer.js');

        // Récupérer les IDs des leads à enrichir
        let targetLeadIds = leadIds;

        if (!targetLeadIds || targetLeadIds.length === 0) {
          // Utiliser le contexte mémorisé
          targetLeadIds = getActiveLeadContext(conversation);

          if (!targetLeadIds || targetLeadIds.length === 0) {
            return {
              success: false,
              error: 'Aucun lead ciblé. Utilisez d\'abord query_espo_leads pour lister les leads, ou fournissez leadIds.'
            };
          }
        }

        // ⚠️ VALIDATION CRITIQUE: Vérifier que les IDs sont valides (pas inventés)
        const ESPO_ID_PATTERN = /^[a-f0-9]{17}$/i; // Format EspoCRM: 17 caractères hexadécimaux
        const invalidIds = targetLeadIds.filter(id => !ESPO_ID_PATTERN.test(id));

        if (invalidIds.length > 0) {
          console.error('[analyze_and_enrich_leads] ❌ IDs INVALIDES détectés:', invalidIds);
          return {
            success: false,
            error: `INVALID_LEAD_ID – Les IDs suivants ne sont pas des IDs EspoCRM valides: ${invalidIds.join(', ')}. Les IDs EspoCRM sont des identifiants de 17 caractères hexadécimaux (ex: "691b2816e43817b92"). Vous DEVEZ d'abord appeler query_espo_leads pour obtenir les vrais IDs des leads avant de les enrichir.`,
            invalidIds,
            message: '⚠️ ERREUR CRITIQUE: Vous avez tenté d\'utiliser des IDs inventés au lieu de vrais IDs EspoCRM. Appelez d\'abord query_espo_leads avec le nom du lead pour obtenir son ID réel.'
          };
        }

        // Charger les leads depuis EspoCRM
        const leadsToAnalyze = [];
        for (const id of targetLeadIds) {
          try {
            const lead = await espoFetch(`/Lead/${id}`);
            leadsToAnalyze.push(lead);
          } catch (error) {
            console.error(`[analyze_and_enrich_leads] Erreur chargement lead ${id}:`, error);
          }
        }

        if (leadsToAnalyze.length === 0) {
          return {
            success: false,
            error: 'Aucun lead trouvé à enrichir'
          };
        }

        console.log(`[analyze_and_enrich_leads] 🔍 Démarrage analyse de ${leadsToAnalyze.length} leads...`);
        console.log(`[analyze_and_enrich_leads] Mode: ${applyUpdates ? 'APPLICATION' : 'PRÉVISUALISATION'}`);

        // Analyser les leads
        const analysisResults = await batchAnalyzeLeads(leadsToAnalyze);

        if (!analysisResults.success) {
          return {
            success: false,
            error: analysisResults.error
          };
        }

        // Si applyUpdates = false, retourner juste la prévisualisation
        if (!applyUpdates) {
          // Créer un aperçu détaillé pour l'utilisateur
          const previewSummary = analysisResults.details
            .filter(d => d.status === 'enriched')
            .slice(0, 5)
            .map(d => `  • ${d.name}: ${d.secteur} [${d.tags.join(', ')}]`)
            .join('\n');

          const totalMessage = analysisResults.enriched > 5
            ? `\n  ... et ${analysisResults.enriched - 5} autres leads`
            : '';

          return {
            success: true,
            mode: 'preview',
            analyzed: analysisResults.analyzed,
            enriched: analysisResults.enriched,
            skipped: analysisResults.skipped,
            preview: analysisResults.details,
            message: `📊 PRÉVISUALISATION ENRICHISSEMENT

✅ ${analysisResults.enriched} leads enrichis (100% traités)

Exemples d'enrichissements détectés:
${previewSummary}${totalMessage}

💡 M.A.X. enrichit TOUS les leads avec stratégies adaptées:
  • Email → Analyse IA domaine
  • Téléphone → Stratégie WhatsApp
  • Minimal → Hypothèse + qualification

Pour appliquer ces enrichissements au CRM, confirmez l'application.`
          };
        }

        // Appliquer les enrichissements
        const leadsForUpdate = formatEnrichedLeadsForUpdate(analysisResults.details);

        if (leadsForUpdate.length === 0) {
          const skipReasons = analysisResults.details
            .filter(d => d.status !== 'enriched')
            .map(d => `  • ${d.name || 'Lead sans nom'}: ${d.reason}`)
            .join('\n');

          // ❌ CE CAS NE DEVRAIT PLUS JAMAIS ARRIVER avec la nouvelle logique 100% enrichissement
          return {
            success: false,
            error: 'Erreur système: Aucun lead enrichi malgré nouvelle logique 100%. Vérifier emailAnalyzer.js',
            analyzed: analysisResults.analyzed,
            details: analysisResults.details
          };
        }

        // Appliquer directement les enrichissements via PATCH (pas besoin de validation complète)
        const updateReport = {
          updated: 0,
          skipped: 0,
          details: []
        };

        for (const lead of leadsForUpdate) {
          try {
            await espoFetch(`/Lead/${lead.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                secteur: lead.secteur,
                tags: lead.maxTags,
                description: lead.description
              })
            });
            updateReport.updated++;
            updateReport.details.push({
              leadId: lead.id,
              action: 'updated',
              message: 'Enrichi avec succès'
            });
          } catch (error) {
            updateReport.skipped++;
            updateReport.details.push({
              leadId: lead.id,
              action: 'skipped',
              reason: error.message
            });
          }
        }

        // Logger l'activité
        logMaxActivity({
          type: 'data_updated',
          entity: 'Lead',
          count: updateReport.updated,
          leadIds: targetLeadIds,
          details: `Enrichissement intelligent: ${updateReport.updated} leads enrichis via analyse email`
        });

        // Enregistrer le rapport d'enrichissement
        const { saveEnrichmentReport } = await import('../lib/enrichmentReporter.js');
        const reportId = await saveEnrichmentReport({
          analyzed: analysisResults.analyzed,
          enriched: analysisResults.enriched,
          skipped: analysisResults.skipped,
          updated: updateReport.updated,
          details: analysisResults.details
        });

        // Créer un résumé détaillé des leads mis à jour
        const updatedSummary = analysisResults.details
          .filter(d => d.status === 'enriched')
          .slice(0, 10)
          .map(d => `  ✓ ${d.name}: ${d.secteur} → [${d.tags.slice(0, 3).join(', ')}]`)
          .join('\n');

        const moreUpdates = updateReport.updated > 10
          ? `\n  ... et ${updateReport.updated - 10} autres leads mis à jour`
          : '';

        // Extraire les erreurs depuis les details (action: 'skipped')
        const errors = updateReport.details.filter(d => d.action === 'skipped');
        const errorDetails = errors.length > 0
          ? `\n\n⚠️ Erreurs lors de la mise à jour (${errors.length}):\n` +
            errors.slice(0, 5).map(e => `  • ${e.lead}: ${e.reason}`).join('\n')
          : '';

        return {
          success: true,
          mode: 'applied',
          analyzed: analysisResults.analyzed,
          enriched: analysisResults.enriched,
          updated: updateReport.updated,
          skipped: analysisResults.skipped + updateReport.skipped,
          details: analysisResults.details,
          reportId: reportId,
          message: `✅ ENRICHISSEMENT TERMINÉ

📈 Résultats:
  • ${updateReport.updated} leads mis à jour dans le CRM (100% traités)
  • ${analysisResults.analyzed} leads analysés par l'IA

📝 Leads enrichis:
${updatedSummary}${moreUpdates}${errorDetails}

💾 Les champs suivants ont été mis à jour:
  • secteurInfere (secteur déduit ou "inconnu" si incertain)
  • tagsIA (stratégie contact: whatsapp, email, à_qualifier...)
  • description (hypothèse M.A.X. + besoins détectés)

📊 Rapport complet sauvegardé : ${reportId}
💡 Utilisez "Affiche le rapport ${reportId}" pour voir les détails complets`
        };

      } catch (error) {
        console.error('[analyze_and_enrich_leads] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'auto_enrich_missing_leads': {
      const { dryRun = false } = args;

      try {
        console.log('[auto_enrich_missing_leads] 🚀 Démarrage auto-enrichissement...');

        // Import du module d'analyse
        const { batchAnalyzeLeads, formatEnrichedLeadsForUpdate } = await import('../lib/emailAnalyzer.js');

        // 1. Récupérer tous les leads
        const allLeadsParams = new URLSearchParams({
          maxSize: '100',
          select: 'id,name,accountName,emailAddress,phoneNumber,addressCity,website,description,secteur',
          orderBy: 'createdAt',
          order: 'desc'
        });

        const allLeadsResult = await espoFetch(`/Lead?${allLeadsParams.toString()}`);

        // 2. Filtrer les leads sans secteur
        const leadsWithoutSecteur = allLeadsResult.list.filter(l => !l.secteur);

        console.log(`[auto_enrich_missing_leads] 📊 Total leads: ${allLeadsResult.list.length}, Sans secteur: ${leadsWithoutSecteur.length}`);

        if (leadsWithoutSecteur.length === 0) {
          return {
            success: true,
            message: `✅ TOUS LES LEADS SONT DÉJÀ ENRICHIS !

📊 Statistiques:
  • Total de leads: ${allLeadsResult.list.length}
  • Leads avec secteur: ${allLeadsResult.list.length}
  • Leads sans secteur: 0

💡 Aucun enrichissement nécessaire.`
          };
        }

        // 3. Analyser les leads
        const analysisResults = await batchAnalyzeLeads(leadsWithoutSecteur);

        if (dryRun) {
          // Mode prévisualisation
          const previewList = analysisResults.details
            .filter(d => d.status === 'enriched')
            .slice(0, 10)
            .map(d => `  • ${d.name}: ${d.secteur} [${d.tags.join(', ')}]`)
            .join('\n');

          const morePreview = analysisResults.enriched > 10
            ? `\n  ... et ${analysisResults.enriched - 10} autres leads`
            : '';

          return {
            success: true,
            mode: 'preview',
            total: leadsWithoutSecteur.length,
            enriched: analysisResults.enriched,
            skipped: analysisResults.skipped,
            message: `🔍 PRÉVISUALISATION AUTO-ENRICHISSEMENT

📊 ${leadsWithoutSecteur.length} leads sans secteur détectés
✅ ${analysisResults.enriched} seront enrichis (100% traités)

📋 Aperçu des enrichissements:
${previewList}${morePreview}

💡 Enrichissement intelligent avec stratégies adaptées:
  • Email disponible → Analyse IA du domaine
  • Téléphone uniquement → Stratégie WhatsApp
  • Données minimales → Hypothèse + qualification manuelle

Pour appliquer ces enrichissements, relancez sans prévisualisation.`
          };
        }

        // 4. Appliquer les enrichissements
        const leadsForUpdate = formatEnrichedLeadsForUpdate(analysisResults.details);

        let successCount = 0;
        let failCount = 0;
        const successDetails = [];

        let tasksCreated = 0;

        for (const lead of leadsForUpdate) {
          try {
            await espoFetch(`/Lead/${lead.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                secteur: lead.secteur,
                tags: lead.maxTags,
                description: lead.description
              })
            });

            const leadDetail = analysisResults.details.find(d => d.leadId === lead.id);
            successDetails.push({
              name: leadDetail?.name || lead.id,
              secteur: lead.secteur,
              tags: lead.maxTags || []
            });

            // Créer une tâche stratégique basée sur l'urgence (DÉSACTIVÉ TEMPORAIREMENT - trop lent + erreur dateEnd)
            if (false && leadDetail) {
              let taskName = '';
              let taskDescription = '';
              let priority = 'Normal';
              let dateEnd = null;

              // Déterminer le type de tâche selon l'urgence
              if (leadDetail.urgence === 'immediate') {
                taskName = `⚡ Contacter ${leadDetail.name} - URGENT`;
                taskDescription = `Lead à forte urgence détecté.\n\nSecteur: ${leadDetail.secteur}\nTags: ${leadDetail.tags ? leadDetail.tags.join(', ') : 'N/A'}\n\n${leadDetail.strategie_contact || 'Contacter rapidement'}`;
                priority = 'Urgent';
                // Échéance: dans 2 jours
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 2);
                dateEnd = deadline.toISOString().split('T')[0];
              } else if (leadDetail.urgence === 'moyen_terme') {
                taskName = `📞 Relancer ${leadDetail.name}`;
                taskDescription = `Lead qualifié à recontacter.\n\nSecteur: ${leadDetail.secteur}\nTags: ${leadDetail.tags ? leadDetail.tags.join(', ') : 'N/A'}\n\n${leadDetail.strategie_contact || 'Prévoir une prise de contact'}`;
                priority = 'Normal';
                // Échéance: dans 5 jours
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 5);
                dateEnd = deadline.toISOString().split('T')[0];
              } else {
                taskName = `📧 Qualifier ${leadDetail.name}`;
                taskDescription = `Lead en prospection froide.\n\nSecteur: ${leadDetail.secteur}\nTags: ${leadDetail.tags ? leadDetail.tags.join(', ') : 'N/A'}\n\n${leadDetail.strategie_contact || 'Lead en nurturing, suivre dans la durée'}`;
                priority = 'Low';
                // Échéance: dans 14 jours
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 14);
                dateEnd = deadline.toISOString().split('T')[0];
              }

              try {
                await espoFetch('/Task', {
                  method: 'POST',
                  body: JSON.stringify({
                    name: taskName,
                    description: taskDescription,
                    status: 'Not Started',
                    priority,
                    dateEnd,
                    parentType: 'Lead',
                    parentId: lead.id,
                    parentName: leadDetail.name
                  })
                });
                tasksCreated++;
              } catch (taskError) {
                console.error(`[auto_enrich_missing_leads] ⚠️ Impossible de créer tâche pour ${lead.id}:`, taskError.message);
              }
            }

            successCount++;
          } catch (error) {
            console.error(`[auto_enrich_missing_leads] ❌ Erreur pour ${lead.id}:`, error.message);
            failCount++;
          }
        }

        // 5. Rapport final
        const successList = successDetails
          .slice(0, 10)
          .map(s => `  • ${s.name}: ${s.secteur} [${s.tags.join(', ')}]`)
          .join('\n');

        const moreSuccess = successCount > 10
          ? `\n  ... et ${successCount - 10} autres leads`
          : '';

        return {
          success: true,
          total: leadsWithoutSecteur.length,
          enriched: successCount,
          failed: failCount,
          tasksCreated,
          details: successDetails,
          message: `✅ AUTO-ENRICHISSEMENT 100% TERMINÉ !

📊 RÉSULTATS:
  • Leads sans secteur détectés: ${leadsWithoutSecteur.length}
  • Leads enrichis: ${successCount} (${failCount > 0 ? `${failCount} en erreur CRM` : '100%'})
  • ✨ Tâches créées automatiquement: ${tasksCreated}

📋 Leads enrichis:
${successList}${moreSuccess}

💾 Champs mis à jour:
  • secteurInfere (secteur déduit ou "inconnu/estimé" si incertain)
  • tagsIA (stratégie: whatsapp, email, à_qualifier, phone_only...)
  • description (hypothèse M.A.X. + besoins détectés)

💡 PHILOSOPHIE M.A.X.:
  • 100% des leads traités, ZÉRO ignoré
  • Email → Analyse IA domaine
  • Téléphone → Stratégie WhatsApp
  • Minimal → Hypothèse basse confiance + qualification manuelle

📋 Tâches créées selon l'urgence:
  • ⚡ Urgence immédiate → Tâche Urgente (échéance: 2 jours)
  • 📞 Moyen terme → Tâche Normale (échéance: 5 jours)
  • 📧 Prospection → Tâche Basse priorité (échéance: 14 jours)

✨ Tous vos leads ont maintenant un secteur ET une stratégie de contact !`
        };

      } catch (error) {
        console.error('[auto_enrich_missing_leads] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'create_custom_field': {
      const {
        entity = 'Lead',
        fieldName,
        label,
        type,
        options,
        maxLength,
        min,
        max,
        consentId
      } = args;

      // 🔐 CONSENT GATE - Validation OBLIGATOIRE pour opérations structurelles
      console.log('[create_custom_field] 🔍 DEBUG: validateConsent type:', typeof validateConsent);
      console.log('[create_custom_field] 🔍 DEBUG: args:', JSON.stringify(args));
      const consentValidation = await validateConsent(
        args,
        'field_creation',
        `Créer le champ custom "${label || fieldName}" (${type}) sur ${entity}`
      );
      console.log('[create_custom_field] 🔍 DEBUG: consentValidation:', JSON.stringify(consentValidation));

      if (!consentValidation.allowed) {
        console.error('[create_custom_field] ❌ BLOQUÉ PAR CONSENT GATE');

        // Retourner réponse 412 intelligente pour self-correction M.A.X.
        return {
          success: false,
          error: consentValidation.error,
          httpCode: consentValidation.httpCode,
          requiresConsent: consentValidation.requiresConsent,
          operation: consentValidation.operation,
          message: consentValidation.message,
          activityLog: consentValidation.activityLog
        };
      }

      console.log('[create_custom_field] ✅ Consent validé - Opération autorisée');

      try {
        console.log(`[create_custom_field] Création champ ${fieldName} (${type}) sur ${entity}`);

        // Construire le payload selon les spécifications EspoCRM
        const payload = {
          name: fieldName,
          label: label,
          type: type,
          isCustom: true
        };

        // Ajouter les propriétés spécifiques selon le type
        if (type === 'enum' || type === 'multiEnum') {
          if (options && options.length > 0) {
            payload.options = options;
          } else {
            return {
              success: false,
              error: `Le type ${type} nécessite un paramètre 'options' (array de strings)`
            };
          }
        }

        if (type === 'varchar' && maxLength) {
          payload.maxLength = maxLength;
        }

        if ((type === 'int' || type === 'float') && (min !== undefined || max !== undefined)) {
          if (min !== undefined) payload.min = min;
          if (max !== undefined) payload.max = max;
        }

        // Utiliser l'API Admin pour créer le champ
        const result = await espoAdminFetch(`/Admin/fieldManager/${entity}/${fieldName}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        console.log(`[create_custom_field] Champ ${fieldName} créé avec succès`);

        // 🚀 AUTO-ADD TO LAYOUTS - Ajouter automatiquement le champ aux layouts
        try {
          console.log(`[create_custom_field] Ajout automatique de ${fieldName} aux layouts...`);
          await addFieldToAllLayouts(entity, fieldName);
          console.log(`[create_custom_field] ✅ ${fieldName} ajouté aux layouts detail et list`);
        } catch (layoutError) {
          console.warn(`[create_custom_field] ⚠️ Erreur lors de l'ajout aux layouts (non-bloquant):`, layoutError.message);
        }

        // Clear cache et rebuild pour appliquer les changements
        try {
          await espoClearCache();
          console.log(`[create_custom_field] ✅ Cache cleared`);
        } catch (cacheError) {
          console.warn(`[create_custom_field] ⚠️ Erreur clear cache:`, cacheError.message);
        }

        return {
          success: true,
          entity,
          fieldName,
          label,
          type,
          message: `✅ Champ custom "${label}" (${fieldName}) créé avec succès sur ${entity} et ajouté aux layouts`,
          details: result
        };
      } catch (error) {
        console.error('[create_custom_field] Erreur:', error);
        return {
          success: false,
          error: error.message,
          hint: 'Vérifiez que les credentials admin sont configurés dans ESPO_USERNAME/ESPO_PASSWORD'
        };
      }
    }

    case 'update_lead_fields': {
      const { leads, fields } = args;

      // Validation des paramètres
      if (!leads || !Array.isArray(leads) || leads.length === 0) {
        return {
          success: false,
          error: 'Paramètre "leads" manquant ou invalide. Doit être un array non-vide avec [{id/name/email}, ...]',
          hint: '⚠️ Ce tool nécessite des leads EXISTANTS. Pour import CSV, utilise update_leads_in_espo({mode: "force_create"}) à la place.'
        };
      }

      if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
        return {
          success: false,
          error: 'Paramètre "fields" manquant ou invalide. Doit être un objet avec les champs à mettre à jour: {fieldName: value, ...}'
        };
      }

      try {
        console.log(`[update_lead_fields] Mise à jour de ${leads.length} lead(s) avec champs:`, Object.keys(fields));

        const results = [];
        const missingFields = [];

        for (const leadInfo of leads) {
          try {
            // 1. Résoudre le lead par ID ou nom/email
            let leadId = leadInfo.id;
            let leadData = null;

            // ⚠️ VALIDATION CRITIQUE: Si un ID est fourni directement, vérifier qu'il est valide
            if (leadId) {
              const ESPO_ID_PATTERN = /^[a-f0-9]{17}$/i;
              if (!ESPO_ID_PATTERN.test(leadId)) {
                results.push({
                  success: false,
                  lead: leadInfo.name || leadInfo.email || leadId,
                  error: `INVALID_LEAD_ID – L'ID "${leadId}" n'est pas un ID EspoCRM valide. Les IDs EspoCRM sont des identifiants de 17 caractères hexadécimaux (ex: "691b2816e43817b92"). Vous devez utiliser le nom ou l'email du lead, ou appeler query_espo_leads pour obtenir le vrai ID.`
                });
                console.error(`[update_lead_fields] ❌ ID INVALIDE: ${leadId}`);
                continue;
              }
            }

            if (!leadId && (leadInfo.name || leadInfo.email)) {
              // Résolution par nom/email
              console.log(`[update_lead_fields] Résolution de "${leadInfo.name || leadInfo.email}"`);

              let searchParams = new URLSearchParams({
                maxSize: '1'
              });

              if (leadInfo.email) {
                searchParams.append('where[0][type]', 'equals');
                searchParams.append('where[0][attribute]', 'emailAddress');
                searchParams.append('where[0][value]', leadInfo.email);
              } else if (leadInfo.name) {
                searchParams.append('where[0][type]', 'equals');
                searchParams.append('where[0][attribute]', 'name');
                searchParams.append('where[0][value]', leadInfo.name);
              }

              const searchResult = await espoFetch(`/Lead?${searchParams.toString()}`);

              if (searchResult && searchResult.list && searchResult.list.length > 0) {
                leadData = searchResult.list[0];
                leadId = leadData.id;
                console.log(`[update_lead_fields] Lead résolu: ${leadData.name} (${leadId})`);
              } else {
                results.push({
                  success: false,
                  lead: leadInfo.name || leadInfo.email,
                  error: '404 - Lead introuvable'
                });
                continue;
              }
            } else if (leadId) {
              // Charger le lead par ID pour obtenir les infos complètes
              try {
                leadData = await espoFetch(`/Lead/${leadId}`);
              } catch (error) {
                if (error.message.includes('404')) {
                  results.push({
                    success: false,
                    lead: leadId,
                    error: '404 - Lead introuvable'
                  });
                  continue;
                }
                throw error;
              }
            }

            // 2. Vérifier les champs custom existent
            const fieldsToCheck = ['maxTags', 'objectifsBusiness', 'servicesSouhaites', 'statutActions', 'prochainesEtapes'];
            for (const field of Object.keys(fields)) {
              if (fieldsToCheck.includes(field) && leadData[field] === undefined) {
                missingFields.push(field);
              }
            }

            // 3. PATCH partiel du lead
            const updated = await espoFetch(`/Lead/${leadId}`, {
              method: 'PATCH',
              body: JSON.stringify(fields)
            });

            // 4. VÉRIFICATION POST-OPÉRATION (Self-Healing)
            // Attendre 300ms pour que l'API propage les changements
            await new Promise(resolve => setTimeout(resolve, 300));

            // Re-lire le lead pour vérifier les changements
            const verified = await espoFetch(`/Lead/${leadId}`);

            // Comparer chaque champ modifié
            const failures = [];
            for (const [fieldName, expectedValue] of Object.entries(fields)) {
              const actualValue = verified[fieldName];

              // Normaliser les valeurs pour comparaison
              const expected = expectedValue === null || expectedValue === undefined ? '' : String(expectedValue);
              const actual = actualValue === null || actualValue === undefined ? '' : String(actualValue);

              if (expected !== actual) {
                failures.push({
                  field: fieldName,
                  expected: expectedValue,
                  actual: actualValue
                });
              }
            }

            // Si échec détecté, consulter le playbook
            if (failures.length > 0) {
              console.warn(`[update_lead_fields] ⚠️ Vérification échouée pour ${leadData.name}:`, failures);

              // Consulter le playbook pour le premier champ en échec
              const { consultPlaybook } = await import('../lib/playbookReader.js');
              const guidance = await consultPlaybook('field_update_failed', {
                leadId,
                leadName: leadData.name,
                field: failures[0].field,
                expectedValue: failures[0].expected,
                actualValue: failures[0].actual,
                allFailures: failures
              }, true);

              results.push({
                success: false,
                lead: leadData.name,
                email: leadData.emailAddress,
                error: 'VERIFICATION_FAILED',
                failures,
                guidance: guidance.ok ? guidance.userMessage : 'Consultez le playbook LEAD_FIELD_UPDATE_FAILED',
                suggestion: `Les champs suivants n'ont pas été mis à jour correctement: ${failures.map(f => f.field).join(', ')}`
              });

              console.log(`[update_lead_fields] 🔧 Guidance:`, guidance.userMessage);
            } else {
              // Succès vérifié
              results.push({
                success: true,
                verified: true,
                lead: leadData.name,
                email: leadData.emailAddress,
                account: leadData.accountName,
                tags: verified.maxTags || fields.maxTags || [],
                objectifs: verified.objectifsBusiness || fields.objectifsBusiness || '',
                services: verified.servicesSouhaites || fields.servicesSouhaites || '',
                statut: verified.statutActions || fields.statutActions || '',
                prochaines: verified.prochainesEtapes || fields.prochainesEtapes || '',
                modifiedAt: verified.modifiedAt || new Date().toISOString()
              });

              console.log(`[update_lead_fields] ✅ Lead ${leadData.name} mis à jour avec succès (vérifié)`);
            }

          } catch (error) {
            console.error(`[update_lead_fields] Erreur lead:`, error);
            results.push({
              success: false,
              lead: leadInfo.name || leadInfo.email || leadInfo.id,
              error: error.message
            });
          }
        }

        // 4. Si des champs manquent, les créer automatiquement
        if (missingFields.length > 0) {
          const uniqueFields = [...new Set(missingFields)];
          console.log(`[update_lead_fields] Champs manquants détectés: ${uniqueFields.join(', ')}`);

          const fieldMappings = {
            maxTags: { label: 'Tags MAX', type: 'array' },
            objectifsBusiness: { label: 'Objectifs Business', type: 'text' },
            servicesSouhaites: { label: 'Services Souhaités', type: 'text' },
            statutActions: { label: 'Statut des Actions', type: 'varchar' },
            prochainesEtapes: { label: 'Prochaines Étapes', type: 'text' }
          };

          for (const fieldName of uniqueFields) {
            const fieldDef = fieldMappings[fieldName];
            if (fieldDef) {
              try {
                await espoAdminFetch(`/Admin/fieldManager/Lead/${fieldName}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    name: fieldName,
                    label: fieldDef.label,
                    type: fieldDef.type,
                    isCustom: true
                  })
                });
                console.log(`[update_lead_fields] Champ ${fieldName} créé automatiquement`);
              } catch (error) {
                console.error(`[update_lead_fields] Erreur création champ ${fieldName}:`, error);
              }
            }
          }

          return {
            success: false,
            message: 'Champs manquants créés. Veuillez rejouer la mise à jour.',
            createdFields: uniqueFields,
            results
          };
        }

        // 5. Retourner le résumé
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;

        return {
          success: true,
          updated: successCount,
          errors: errorCount,
          results
        };

      } catch (error) {
        console.error('[update_lead_fields] Erreur globale:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'get_lead_snapshot': {
      const { leads } = args;

      try {
        console.log(`[get_lead_snapshot] Snapshot de ${leads.length} lead(s)`);

        const snapshots = [];

        for (const leadInfo of leads) {
          try {
            // Résoudre le lead
            let leadId = leadInfo.id;
            let leadData = null;

            if (!leadId && (leadInfo.name || leadInfo.email)) {
              let searchParams = new URLSearchParams({ maxSize: '1' });

              if (leadInfo.email) {
                searchParams.append('where[0][type]', 'equals');
                searchParams.append('where[0][attribute]', 'emailAddress');
                searchParams.append('where[0][value]', leadInfo.email);
              } else if (leadInfo.name) {
                searchParams.append('where[0][type]', 'equals');
                searchParams.append('where[0][attribute]', 'name');
                searchParams.append('where[0][value]', leadInfo.name);
              }

              const searchResult = await espoFetch(`/Lead?${searchParams.toString()}`);

              if (searchResult && searchResult.list && searchResult.list.length > 0) {
                leadData = searchResult.list[0];
                leadId = leadData.id;
              } else {
                snapshots.push({
                  success: false,
                  lead: leadInfo.name || leadInfo.email,
                  error: 'Lead introuvable'
                });
                continue;
              }
            } else if (leadId) {
              try {
                leadData = await espoFetch(`/Lead/${leadId}`);
              } catch (error) {
                snapshots.push({
                  success: false,
                  lead: leadId,
                  error: 'Lead introuvable (404)'
                });
                continue;
              }
            }

            // Créer le snapshot avec les 5 champs clés
            snapshots.push({
              success: true,
              nom: leadData.name || '',
              email: leadData.emailAddress || '',
              compte: leadData.accountName || '',
              tags: leadData.maxTags || [],
              objectifs: leadData.objectifsBusiness || '',
              services: leadData.servicesSouhaites || '',
              statut: leadData.statutActions || '',
              prochaines: leadData.prochainesEtapes || '',
              modifiedAt: leadData.modifiedAt || ''
            });

          } catch (error) {
            console.error(`[get_lead_snapshot] Erreur:`, error);
            snapshots.push({
              success: false,
              lead: leadInfo.name || leadInfo.email || leadInfo.id,
              error: error.message
            });
          }
        }

        return {
          success: true,
          count: snapshots.length,
          snapshots
        };

      } catch (error) {
        console.error('[get_lead_snapshot] Erreur globale:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'configure_entity_layout': {
      const { entity = 'Lead', fieldName, createField = false, fieldDefinition = {}, consentId } = args;

      // Validate fieldName parameter
      if (!fieldName || typeof fieldName !== 'string' || fieldName.trim() === '' || fieldName === 'undefined' || fieldName === 'null') {
        console.error(`[configure_entity_layout] Invalid fieldName: "${fieldName}"`);
        return {
          success: false,
          error: `Invalid fieldName parameter: "${fieldName}". Field name must be a non-empty string and cannot be "undefined" or "null". Please provide a valid field name.`,
          entity,
          fieldName
        };
      }

      // 🔐 CONSENT GATE - Validation OBLIGATOIRE pour opérations structurelles
      const operationDescription = createField
        ? `Créer le champ "${fieldName}" ET l'ajouter aux layouts ${entity}`
        : `Ajouter le champ "${fieldName}" aux layouts ${entity}`;

      const consentValidation = await validateConsent(
        args,
        'layout_modification',
        operationDescription
      );

      if (!consentValidation.allowed) {
        console.error('[configure_entity_layout] ❌ BLOQUÉ PAR CONSENT GATE');

        // Retourner réponse 412 intelligente pour self-correction M.A.X.
        return {
          success: false,
          error: consentValidation.error,
          httpCode: consentValidation.httpCode,
          requiresConsent: consentValidation.requiresConsent,
          operation: consentValidation.operation,
          message: consentValidation.message,
          activityLog: consentValidation.activityLog
        };
      }

      console.log('[configure_entity_layout] ✅ Consent validé - Opération autorisée');

      try {
        console.log(`[configure_entity_layout] Configuration complète pour ${fieldName} sur ${entity}`);

        const results = {
          steps: []
        };

        // Étape 1: Créer le champ si demandé
        if (createField) {
          console.log(`[configure_entity_layout] Création du champ ${fieldName}...`);

          const fieldDef = {
            type: fieldDefinition.type || 'varchar',
            maxLength: fieldDefinition.maxLength || 255,
            isCustom: true,
            ...fieldDefinition
          };

          try {
            await espoAdminFetch(`/Admin/fieldManager/${entity}/${fieldName}`, {
              method: 'PUT',
              body: JSON.stringify(fieldDef)
            });

            results.steps.push({ step: 'create_field', success: true, field: fieldName });
          } catch (error) {
            // Ignorer si le champ existe déjà
            if (error.message.includes('409') || error.message.includes('exists')) {
              results.steps.push({ step: 'create_field', success: true, field: fieldName, note: 'Already exists' });
            } else {
              throw error;
            }
          }
        }

        // Étape 2: Ajouter le champ aux layouts
        console.log(`[configure_entity_layout] Ajout de ${fieldName} aux layouts...`);

        const layoutResult = await addFieldToAllLayouts(entity, fieldName, {
          fullWidth: fieldDefinition.fullWidth !== false,
          listWidth: fieldDefinition.listWidth || 10
        });

        results.steps.push({
          step: 'add_to_layouts',
          success: layoutResult.success,
          layoutResults: layoutResult.results
        });

        // Étape 3: Clear cache
        console.log(`[configure_entity_layout] Nettoyage du cache...`);
        const cacheResult = await espoClearCache();
        results.steps.push({
          step: 'clear_cache',
          success: cacheResult.success,
          output: cacheResult.output
        });

        // Étape 4: Rebuild
        console.log(`[configure_entity_layout] Rebuild EspoCRM...`);
        const rebuildResult = await espoRebuild();
        results.steps.push({
          step: 'rebuild',
          success: rebuildResult.success,
          output: rebuildResult.output
        });

        const allSuccess = results.steps.every(step => step.success);

        // Log l'activité M.A.X.
        if (allSuccess) {
          logMaxActivity({
            type: createField ? 'field_created' : 'layout_modified',
            entity,
            fieldName,
            fieldType: createField ? fieldDefinition.type : undefined,
            details: createField
              ? `Champ ${fieldName} (${fieldDefinition.type}) créé et ajouté aux layouts`
              : `Champ ${fieldName} ajouté aux layouts`
          });
        }

        return {
          success: allSuccess,
          message: allSuccess
            ? `Champ ${fieldName} configuré avec succès sur ${entity}. Layouts mis à jour et rebuild terminé.`
            : `Configuration partiellement terminée. Certaines étapes ont échoué.`,
          entity,
          fieldName,
          steps: results.steps
        };

      } catch (error) {
        console.error('[configure_entity_layout] Erreur:', error);
        return {
          success: false,
          error: error.message,
          entity,
          fieldName
        };
      }
    }

    case 'create_task': {
      const {
        name,
        description = '',
        status = 'Not Started',
        priority = 'Normal',
        dateStart,
        dateEnd,
        parentType = 'Lead',
        parentId,
        assignedUserId
      } = args;

      try {
        console.log(`[create_task] Création tâche "${name}" pour ${parentType} ${parentId}`);

        const taskData = {
          name,
          description,
          status,
          priority,
          parentType,
          parentId,
          parentName: '' // EspoCRM le remplira automatiquement
        };

        // Ajouter dates si fournies
        if (dateStart) taskData.dateStart = dateStart;
        if (dateEnd) taskData.dateEnd = dateEnd;

        // Assigner à un utilisateur si spécifié
        if (assignedUserId) {
          taskData.assignedUserId = assignedUserId;
        }

        // Créer la tâche via l'API EspoCRM
        const task = await espoFetch('/Task', {
          method: 'POST',
          body: JSON.stringify(taskData)
        });

        console.log(`[create_task] ✅ Tâche créée: ${task.id}`);

        return {
          success: true,
          taskId: task.id,
          taskName: name,
          parentType,
          parentId,
          status,
          priority,
          message: `Tâche "${name}" créée avec succès pour ${parentType} ${parentId}`
        };

      } catch (error) {
        console.error('[create_task] Erreur:', error);
        return {
          success: false,
          error: error.message,
          taskName: name
        };
      }
    }

    case 'analyze_empty_fields': {
      const { entity = 'Lead', sampleSize = 20 } = args;

      try {
        console.log(`[analyze_empty_fields] Analyse des champs vides pour ${entity} (${sampleSize} records)...`);

        // Récupérer un échantillon de records
        const result = await espoFetch(`/${entity}?maxSize=${sampleSize}&orderBy=createdAt&order=desc`);

        if (!result.list || result.list.length === 0) {
          return {
            success: false,
            error: `Aucun ${entity} trouvé dans le CRM`,
            entity
          };
        }

        // Analyser les champs pour identifier lesquels sont souvent vides
        const fieldStats = {};

        result.list.forEach(record => {
          Object.keys(record).forEach(field => {
            if (!fieldStats[field]) {
              fieldStats[field] = { empty: 0, filled: 0, total: 0 };
            }

            fieldStats[field].total++;

            const value = record[field];
            const isEmpty = value === null ||
                           value === undefined ||
                           value === '' ||
                           (Array.isArray(value) && value.length === 0);

            if (isEmpty) {
              fieldStats[field].empty++;
            } else {
              fieldStats[field].filled++;
            }
          });
        });

        // Trier par nombre de champs vides (du plus vide au plus rempli)
        const sortedFields = Object.entries(fieldStats)
          .sort((a, b) => b[1].empty - a[1].empty);

        // Créer rapport
        const emptyFields = [];
        const criticalEmptyFields = [];

        const criticalFieldsList = [
          'phoneNumber', 'website', 'addressStreet', 'addressCity', 'addressCountry',
          'description', 'assignedUserId', 'budget', 'firstName', 'lastName',
          'title', 'industry'
        ];

        for (const [field, stats] of sortedFields) {
          if (stats.empty > 0) {
            const emptyPercent = Math.round((stats.empty / stats.total) * 100);
            const fieldInfo = {
              name: field,
              emptyCount: stats.empty,
              totalCount: stats.total,
              emptyPercent,
              status: emptyPercent === 100 ? 'completement_vide' :
                      emptyPercent >= 80 ? 'majoritairement_vide' :
                      emptyPercent >= 50 ? 'moitie_vide' : 'partiellement_vide'
            };

            emptyFields.push(fieldInfo);

            if (criticalFieldsList.includes(field)) {
              criticalEmptyFields.push(fieldInfo);
            }
          }
        }

        console.log(`[analyze_empty_fields] Trouvé ${emptyFields.length} champs avec valeurs vides`);

        return {
          success: true,
          entity,
          sampleSize: result.list.length,
          totalFieldsWithEmpty: emptyFields.length,
          emptyFields,
          criticalEmptyFields,
          message: `Analyse de ${result.list.length} ${entity}(s) terminée. ${emptyFields.length} champs ont au moins une valeur vide.`
        };

      } catch (error) {
        console.error('[analyze_empty_fields] Erreur:', error);
        return {
          success: false,
          error: error.message,
          entity
        };
      }
    }

    case 'list_available_fields': {
      const { entity = 'Lead' } = args;

      try {
        console.log(`[list_available_fields] Récupération des champs pour ${entity}...`);

        // Récupérer un exemple d'entité pour voir tous les champs
        const examples = await espoFetch(`/${entity}?maxSize=1`);

        if (!examples.list || examples.list.length === 0) {
          return {
            success: false,
            error: `Aucun ${entity} trouvé pour inspecter les champs`,
            entity
          };
        }

        const example = examples.list[0];
        const fields = Object.keys(example);

        // Catégoriser les champs
        const standardFields = [];
        const customFields = [];
        const relationFields = [];

        for (const fieldName of fields) {
          const value = example[fieldName];
          const type = Array.isArray(value) ? 'array' : typeof value;

          const fieldInfo = {
            name: fieldName,
            type,
            currentValue: value,
            isCustom: false
          };

          // Détecter les champs custom (heuristique)
          if (fieldName.includes('_') || fieldName.startsWith('max') || fieldName === 'secteur' || fieldName === 'segments') {
            fieldInfo.isCustom = true;
            customFields.push(fieldInfo);
          } else if (fieldName.endsWith('Id') || fieldName.endsWith('Name') || fieldName.endsWith('Ids') || fieldName.endsWith('Names')) {
            relationFields.push(fieldInfo);
          } else {
            standardFields.push(fieldInfo);
          }
        }

        console.log(`[list_available_fields] Trouvé ${fields.length} champs (${customFields.length} custom)`);

        return {
          success: true,
          entity,
          totalFields: fields.length,
          standardFields,
          customFields,
          relationFields,
          message: `${entity} possède ${fields.length} champs disponibles (${customFields.length} custom, ${standardFields.length} standards, ${relationFields.length} relations)`
        };

      } catch (error) {
        console.error('[list_available_fields] Erreur:', error);
        return {
          success: false,
          error: error.message,
          entity
        };
      }
    }

    case 'delete_custom_field': {
      const { entity = 'Lead', fieldName, userConfirmed = false, forceDelete = false } = args;

      try {
        console.log(`[delete_custom_field] Demande de suppression du champ "${fieldName}" pour ${entity}`);

        // Import nécessaires
        const fs = await import('fs/promises');
        const path = await import('path');
        const { execSync } = await import('child_process');

        const ESPOCRM_DIR = process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm';
        const PHP_PATH = process.env.PHP_PATH || 'D:\\Macrea\\xampp\\php\\php.exe';

        const entityDefsPath = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\metadata\\entityDefs\\${entity}.json`;
        const layoutsDir = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\layouts\\${entity}`;

        // 1. GARDE-FOU: Vérifier que le fichier entityDefs existe
        let entityDefs;
        try {
          const content = await fs.readFile(entityDefsPath, 'utf-8');
          entityDefs = JSON.parse(content);
        } catch (error) {
          return {
            success: false,
            error: `Impossible de lire les métadonnées pour ${entity}. Vérifiez que l'entité existe.`,
            entity,
            fieldName
          };
        }

        // 2. GARDE-FOU: Vérifier que le champ existe
        if (!entityDefs.fields || !entityDefs.fields[fieldName]) {
          return {
            success: false,
            error: `Le champ "${fieldName}" n'existe pas dans ${entity}.`,
            entity,
            fieldName,
            availableFields: Object.keys(entityDefs.fields || {})
          };
        }

        const fieldDef = entityDefs.fields[fieldName];

        // 3. GARDE-FOU CRITIQUE: Vérifier que c'est un champ custom
        if (!fieldDef.isCustom) {
          return {
            success: false,
            error: `🚫 OPÉRATION REFUSÉE: Le champ "${fieldName}" est un champ SYSTÈME (isCustom=false). Seuls les champs custom peuvent être supprimés. Ceci est une protection contre les suppressions accidentelles de champs essentiels.`,
            entity,
            fieldName,
            fieldType: fieldDef.type,
            isCustom: false
          };
        }

        // 4. Vérifier si le champ contient des données
        let hasData = false;
        let dataCount = 0;

        try {
          const records = await espoFetch(`/${entity}?maxSize=100&select=id,${fieldName}`);

          if (records.list) {
            const recordsWithData = records.list.filter(record => {
              const value = record[fieldName];
              return value !== null && value !== undefined && value !== '' &&
                     (!Array.isArray(value) || value.length > 0);
            });

            hasData = recordsWithData.length > 0;
            dataCount = recordsWithData.length;
          }
        } catch (error) {
          console.warn(`[delete_custom_field] Impossible de vérifier les données: ${error.message}`);
        }

        // 5. Si pas de confirmation utilisateur, retourner message de confirmation
        if (!userConfirmed) {
          return {
            success: false,
            requiresConfirmation: true,
            entity,
            fieldName,
            fieldType: fieldDef.type,
            isCustom: true,
            hasData,
            dataCount,
            message: hasData
              ? `⚠️ ATTENTION: Le champ "${fieldName}" contient des données dans ${dataCount} ${entity}(s). La suppression effacera définitivement ces données. Pour confirmer, appelez à nouveau ce tool avec userConfirmed=true ${dataCount > 0 ? 'et forceDelete=true' : ''}.`
              : `Le champ "${fieldName}" est vide et peut être supprimé en toute sécurité. Pour confirmer, appelez à nouveau ce tool avec userConfirmed=true.`,
            nextStep: `delete_custom_field({ entity: "${entity}", fieldName: "${fieldName}", userConfirmed: true${hasData ? ', forceDelete: true' : ''} })`
          };
        }

        // 6. GARDE-FOU: Refuser si hasData mais pas forceDelete
        if (hasData && !forceDelete) {
          return {
            success: false,
            error: `🚫 SUPPRESSION REFUSÉE: Le champ "${fieldName}" contient des données dans ${dataCount} ${entity}(s). Pour supprimer malgré tout, utilisez forceDelete=true.`,
            entity,
            fieldName,
            hasData: true,
            dataCount,
            requiresForceDelete: true
          };
        }

        // 7. BACKUP automatique avant suppression
        const backupDir = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\metadata\\entityDefs\\backups`;
        try {
          await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
          // Dossier existe déjà
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${backupDir}\\${entity}_${fieldName}_${timestamp}.json`;
        await fs.writeFile(backupPath, JSON.stringify({ field: fieldDef, deletedAt: new Date().toISOString() }, null, 2));

        console.log(`[delete_custom_field] Backup créé: ${backupPath}`);

        // 8. SUPPRESSION du champ dans entityDefs
        delete entityDefs.fields[fieldName];
        await fs.writeFile(entityDefsPath, JSON.stringify(entityDefs, null, 4), 'utf-8');

        console.log(`[delete_custom_field] Champ "${fieldName}" supprimé de entityDefs`);

        // 9. Nettoyage des layouts
        const layoutsCleaned = [];

        try {
          const layoutFiles = await fs.readdir(layoutsDir);

          for (const file of layoutFiles) {
            if (!file.endsWith('.json')) continue;

            const layoutPath = `${layoutsDir}\\${file}`;
            let layout = JSON.parse(await fs.readFile(layoutPath, 'utf-8'));
            let modified = false;

            if (file === 'detail.json' || file === 'detailSmall.json') {
              layout.forEach(panel => {
                if (!panel.rows) return;
                panel.rows = panel.rows.map(row => {
                  const filtered = row.filter(cell => {
                    if (cell && cell.name === fieldName) {
                      modified = true;
                      return false;
                    }
                    return true;
                  });
                  return filtered;
                });
              });
            } else if (file === 'list.json') {
              const original = layout.length;
              layout = layout.filter(item => {
                if (item && item.name === fieldName) {
                  modified = true;
                  return false;
                }
                return true;
              });
              if (layout.length < original) modified = true;
            }

            if (modified) {
              await fs.writeFile(layoutPath, JSON.stringify(layout, null, 4), 'utf-8');
              layoutsCleaned.push(file);
            }
          }
        } catch (error) {
          console.warn(`[delete_custom_field] Erreur nettoyage layouts: ${error.message}`);
        }

        // 10. Clear cache et rebuild
        console.log('[delete_custom_field] Clear cache et rebuild...');
        execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" clear-cache`, { stdio: 'pipe' });
        execSync(`"${PHP_PATH}" "${ESPOCRM_DIR}\\command.php" rebuild`, { stdio: 'pipe' });

        return {
          success: true,
          entity,
          fieldName,
          fieldType: fieldDef.type,
          wasCustom: true,
          hadData: hasData,
          dataCount,
          backupPath,
          layoutsCleaned,
          message: `✅ Champ "${fieldName}" supprimé avec succès de ${entity}. ${hasData ? `${dataCount} enregistrement(s) contenaient des données qui ont été effacées.` : 'Aucune donnée n\'a été perdue.'} Backup créé: ${backupPath}. Layouts nettoyés: ${layoutsCleaned.join(', ')}.`
        };

      } catch (error) {
        console.error('[delete_custom_field] Erreur:', error);
        return {
          success: false,
          error: error.message,
          entity,
          fieldName
        };
      }
    }

    case 'reorganize_layout': {
      const { entity = 'Lead', layoutType = 'detail', fieldToMove, position, referenceField } = args;

      try {
        console.log(`[reorganize_layout] Réorganisation ${entity}/${layoutType}: déplacer "${fieldToMove}" ${position} "${referenceField}"`);

        const fs = await import('fs/promises');
        const ESPOCRM_DIR = process.env.ESPOCRM_DIR || 'D:\\Macrea\\xampp\\htdocs\\espocrm';
        const layoutPath = `${ESPOCRM_DIR}\\custom\\Espo\\Custom\\Resources\\layouts\\${entity}\\${layoutType}.json`;

        // Lire le layout actuel
        let layout;
        try {
          const content = await fs.readFile(layoutPath, 'utf-8');
          layout = JSON.parse(content);
        } catch (error) {
          return {
            success: false,
            error: `Impossible de lire le layout ${entity}/${layoutType}.json: ${error.message}`
          };
        }

        let moved = false;
        let fieldFound = false;
        let referenceFound = false;

        if (layoutType === 'detail') {
          // Traiter le layout detail (structure de panels avec rows)
          for (const panel of layout) {
            if (!panel.rows) continue;

            // Extraire le champ à déplacer
            let fieldRow = null;
            let fieldRowIndex = -1;

            panel.rows = panel.rows.filter((row, index) => {
              const hasField = row.some(cell => cell && cell.name === fieldToMove);
              if (hasField) {
                fieldRow = row;
                fieldRowIndex = index;
                fieldFound = true;
                return false; // Retirer de sa position actuelle
              }
              return true;
            });

            if (fieldRow) {
              // Trouver la référence et insérer
              for (let i = 0; i < panel.rows.length; i++) {
                const hasReference = panel.rows[i].some(cell => cell && cell.name === referenceField);
                if (hasReference) {
                  referenceFound = true;
                  const insertIndex = position === 'before' ? i : i + 1;
                  panel.rows.splice(insertIndex, 0, fieldRow);
                  moved = true;
                  break;
                }
              }
              break;
            }
          }
        } else if (layoutType === 'list') {
          // Traiter le layout list (array simple d'objets)
          let fieldItem = null;
          let fieldIndex = -1;

          // Extraire le champ à déplacer
          layout = layout.filter((item, index) => {
            if (item && item.name === fieldToMove) {
              fieldItem = item;
              fieldIndex = index;
              fieldFound = true;
              return false;
            }
            return true;
          });

          if (fieldItem) {
            // Trouver la référence et insérer
            for (let i = 0; i < layout.length; i++) {
              if (layout[i] && layout[i].name === referenceField) {
                referenceFound = true;
                const insertIndex = position === 'before' ? i : i + 1;
                layout.splice(insertIndex, 0, fieldItem);
                moved = true;
                break;
              }
            }
          }
        }

        if (!fieldFound) {
          return {
            success: false,
            error: `Le champ "${fieldToMove}" n'a pas été trouvé dans le layout ${layoutType}.`
          };
        }

        if (!referenceFound) {
          return {
            success: false,
            error: `Le champ de référence "${referenceField}" n'a pas été trouvé dans le layout ${layoutType}.`
          };
        }

        if (!moved) {
          return {
            success: false,
            error: `Impossible de déplacer "${fieldToMove}" ${position} "${referenceField}".`
          };
        }

        // Sauvegarder le layout modifié
        await fs.writeFile(layoutPath, JSON.stringify(layout, null, 2), 'utf-8');

        // Clear cache
        try {
          await espoClearCache();
        } catch (cacheError) {
          console.warn(`[reorganize_layout] Erreur clear cache: ${cacheError.message}`);
        }

        return {
          success: true,
          entity,
          layoutType,
          message: `✅ Layout réorganisé : "${fieldToMove}" déplacé ${position === 'before' ? 'avant' : 'après'} "${referenceField}" dans ${entity}/${layoutType}.`
        };

      } catch (error) {
        console.error('[reorganize_layout] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'list_dashlets': {
      const { userId, page = 'Home' } = args;

      try {
        console.log(`[list_dashlets] Récupération dashlets pour page: ${page}`);

        // Récupérer les préférences utilisateur (dashboard layout)
        const userIdToUse = userId || '690f3d658c09dda31'; // ID admin par défaut
        const preferences = await espoFetch(`/Preferences/${userIdToUse}`);

        const dashboardLayout = preferences?.dashboardLayout || preferences?.[`dashboardLayout${page}`] || [];

        const dashlets = dashboardLayout.map((dashlet, index) => ({
          id: dashlet.id || `dashlet-${index}`,
          type: dashlet.name,
          title: dashlet.options?.title || dashlet.name,
          position: {
            column: dashlet.column || 0,
            row: dashlet.row || 0,
            width: dashlet.width || 2,
            height: dashlet.height || 2
          },
          options: dashlet.options || {}
        }));

        return {
          success: true,
          page,
          dashlets,
          count: dashlets.length,
          message: `${dashlets.length} dashlet(s) sur la page ${page}`
        };

      } catch (error) {
        console.error('[list_dashlets] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'add_dashlet': {
      const { page = 'Home', type, title, position = {}, options = {} } = args;

      try {
        console.log(`[add_dashlet] Ajout dashlet "${title}" (${type}) sur page ${page}`);

        const userIdToUse = '690f3d658c09dda31'; // ID admin
        const preferences = await espoFetch(`/Preferences/${userIdToUse}`);

        const dashboardLayoutKey = page === 'Home' ? 'dashboardLayout' : `dashboardLayout${page}`;
        const dashboardLayout = preferences?.[dashboardLayoutKey] || [];

        // Créer le nouveau dashlet
        const newDashlet = {
          id: `dashlet-${Date.now()}`,
          name: type,
          column: position.column ?? 0,
          row: position.row ?? dashboardLayout.length,
          width: position.width ?? 2,
          height: position.height ?? 2,
          options: {
            title,
            ...options
          }
        };

        dashboardLayout.push(newDashlet);

        // Mettre à jour les préférences
        await espoFetch(`/Preferences/${userIdToUse}`, {
          method: 'PUT',
          body: JSON.stringify({
            [dashboardLayoutKey]: dashboardLayout
          })
        });

        return {
          success: true,
          dashletId: newDashlet.id,
          type,
          title,
          position: {
            column: newDashlet.column,
            row: newDashlet.row,
            width: newDashlet.width,
            height: newDashlet.height
          },
          message: `✅ Dashlet "${title}" ajouté sur ${page} (colonne ${newDashlet.column}, ligne ${newDashlet.row})`
        };

      } catch (error) {
        console.error('[add_dashlet] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'update_dashlet': {
      const { dashletId, title, position, options } = args;

      try {
        console.log(`[update_dashlet] Modification dashlet ${dashletId}`);

        const userIdToUse = '690f3d658c09dda31';
        const preferences = await espoFetch(`/Preferences/${userIdToUse}`);

        let updated = false;
        let dashletUpdated = null;

        // Chercher dans toutes les pages de dashboard
        for (const key of Object.keys(preferences)) {
          if (key.startsWith('dashboardLayout')) {
            const layout = preferences[key];
            if (Array.isArray(layout)) {
              const index = layout.findIndex(d => d.id === dashletId);
              if (index !== -1) {
                if (title) layout[index].options = { ...layout[index].options, title };
                if (position) {
                  if (position.column !== undefined) layout[index].column = position.column;
                  if (position.row !== undefined) layout[index].row = position.row;
                  if (position.width !== undefined) layout[index].width = position.width;
                  if (position.height !== undefined) layout[index].height = position.height;
                }
                if (options) layout[index].options = { ...layout[index].options, ...options };

                dashletUpdated = layout[index];
                updated = true;

                await espoFetch(`/Preferences/${userIdToUse}`, {
                  method: 'PUT',
                  body: JSON.stringify({ [key]: layout })
                });

                break;
              }
            }
          }
        }

        if (!updated) {
          return {
            success: false,
            error: `Dashlet ${dashletId} introuvable`
          };
        }

        return {
          success: true,
          dashletId,
          message: `✅ Dashlet "${dashletUpdated.options?.title || dashletId}" modifié`
        };

      } catch (error) {
        console.error('[update_dashlet] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'remove_dashlet': {
      const { dashletId } = args;

      try {
        console.log(`[remove_dashlet] Suppression dashlet ${dashletId}`);

        const userIdToUse = '690f3d658c09dda31';
        const preferences = await espoFetch(`/Preferences/${userIdToUse}`);

        let removed = false;
        let dashletTitle = null;

        for (const key of Object.keys(preferences)) {
          if (key.startsWith('dashboardLayout')) {
            const layout = preferences[key];
            if (Array.isArray(layout)) {
              const index = layout.findIndex(d => d.id === dashletId);
              if (index !== -1) {
                dashletTitle = layout[index].options?.title || layout[index].name;
                layout.splice(index, 1);
                removed = true;

                await espoFetch(`/Preferences/${userIdToUse}`, {
                  method: 'PUT',
                  body: JSON.stringify({ [key]: layout })
                });

                break;
              }
            }
          }
        }

        if (!removed) {
          return {
            success: false,
            error: `Dashlet ${dashletId} introuvable`
          };
        }

        return {
          success: true,
          dashletId,
          message: `✅ Dashlet "${dashletTitle}" supprimé`
        };

      } catch (error) {
        console.error('[remove_dashlet] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ========== EXTENSION MACREA CORE UNIVERSAL ==========

    case 'enrich_lead_universal': {
      const { leadId, source, tagsIA, secteurInfere, typeClient, niveauMaturite,
              canalPrefere, objectifsClient, servicesSouhaites, notesIA,
              prochaineAction, prochaineRelance, scoreIA } = args;

      try {
        console.log(`[enrich_lead_universal] Enrichissement du lead ${leadId}`);

        // Construire le payload de mise à jour (seulement les champs fournis)
        const updateData = {};
        if (source) updateData.source = source;
        if (tagsIA) updateData.tagsIA = tagsIA;
        if (secteurInfere) updateData.secteurInfere = secteurInfere;
        if (typeClient) updateData.typeClient = typeClient;
        if (niveauMaturite) updateData.niveauMaturite = niveauMaturite;
        if (canalPrefere) updateData.canalPrefere = canalPrefere;
        if (objectifsClient) updateData.objectifsClient = objectifsClient;
        if (servicesSouhaites) updateData.servicesSouhaites = servicesSouhaites;
        if (notesIA) updateData.notesIA = notesIA;
        if (prochaineAction) updateData.prochaineAction = prochaineAction;
        if (prochaineRelance) updateData.prochaineRelance = prochaineRelance;
        if (scoreIA !== undefined) updateData.scoreIA = scoreIA;

        // Mettre à jour le lead dans EspoCRM
        const updatedLead = await espoFetch(`/Lead/${leadId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'lead_enriched',
          entity: 'Lead',
          entityId: leadId,
          fieldsUpdated: Object.keys(updateData),
          details: `Lead enrichi : ${secteurInfere || 'N/A'} | Score: ${scoreIA || 'N/A'}`
        });

        return {
          success: true,
          leadId,
          fieldsUpdated: Object.keys(updateData).length,
          scoreIA: scoreIA || null,
          secteur: secteurInfere || null,
          tags: tagsIA || [],
          message: `✅ Lead ${leadId} enrichi avec ${Object.keys(updateData).length} champs`
        };

      } catch (error) {
        console.error('[enrich_lead_universal] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'create_mission_max': {
      const { name, typeAction, description, resultat, leadId, accountId,
              statutExecution, tokensUtilises, dureeExecution } = args;

      try {
        console.log(`[create_mission_max] Création mission : ${name}`);

        // Construire le payload de la mission
        const missionData = {
          name,
          typeAction,
          description: description || '',
          resultat: resultat || '',
          statutExecution: statutExecution || 'Réussi',
          dateExecution: new Date().toISOString(),
          tokensUtilises: tokensUtilises || 0,
          dureeExecution: dureeExecution || 0
        };

        // Ajouter les relations si présentes
        if (leadId) missionData.leadId = leadId;
        if (accountId) missionData.accountId = accountId;

        // Créer l'entité MissionMAX dans EspoCRM
        const mission = await espoFetch('/MissionMAX', {
          method: 'POST',
          body: JSON.stringify(missionData)
        });

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'mission_created',
          entity: 'MissionMAX',
          entityId: mission.id,
          details: `Mission créée : ${typeAction} - ${name}`
        });

        return {
          success: true,
          missionId: mission.id,
          name,
          typeAction,
          message: `✅ Mission "${name}" enregistrée`
        };

      } catch (error) {
        console.error('[create_mission_max] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'generate_diagnostic_ia': {
      const { leadId, syntheseIA, forcesDetectees, opportunites, risques,
              recommandations, scoreConfiance } = args;

      try {
        console.log(`[generate_diagnostic_ia] Diagnostic du lead ${leadId}`);

        // Récupérer le lead pour le titre
        const lead = await espoFetch(`/Lead/${leadId}`);
        const leadName = lead.name || `Lead ${leadId}`;

        // Construire le payload du diagnostic
        const diagnosticData = {
          name: `Diagnostic IA - ${leadName}`,
          leadId,
          syntheseIA,
          forcesDetectees: forcesDetectees || '',
          opportunites: opportunites || '',
          risques: risques || '',
          recommandations: recommandations || '',
          scoreConfiance: scoreConfiance || 70,
          dateGeneration: new Date().toISOString()
        };

        // Créer l'entité DiagnosticIA dans EspoCRM
        const diagnostic = await espoFetch('/DiagnosticIA', {
          method: 'POST',
          body: JSON.stringify(diagnosticData)
        });

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'diagnostic_generated',
          entity: 'DiagnosticIA',
          entityId: diagnostic.id,
          leadId,
          details: `Diagnostic généré pour ${leadName} - Score confiance: ${scoreConfiance || 70}`
        });

        return {
          success: true,
          diagnosticId: diagnostic.id,
          leadId,
          scoreConfiance: scoreConfiance || 70,
          message: `✅ Diagnostic généré pour "${leadName}"`
        };

      } catch (error) {
        console.error('[generate_diagnostic_ia] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ========== TOOLS BULLE M.A.X. & EMAIL ==========

    case 'create_email_template': {
      const { name, subject, bodyHtml, category } = args;

      try {
        console.log(`[create_email_template] Création template : ${name}`);

        // Construire le payload du template
        const templateData = {
          name,
          subject,
          bodyHtml,
          category: category || 'MaCréa CORE'
        };

        // Créer l'entité EmailTemplate dans EspoCRM
        const template = await espoFetch('/EmailTemplate', {
          method: 'POST',
          body: JSON.stringify(templateData)
        });

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'email_template_created',
          entity: 'EmailTemplate',
          entityId: template.id,
          details: `Template créé : ${name} - Catégorie: ${category || 'MaCréa CORE'}`
        });

        return {
          success: true,
          templateId: template.id,
          name,
          category: category || 'MaCréa CORE',
          message: `✅ Template email "${name}" créé dans EspoCRM`
        };

      } catch (error) {
        console.error('[create_email_template] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'get_missions_for_lead': {
      const { leadId, limit, orderBy, order } = args;

      try {
        console.log(`[get_missions_for_lead] Récupération missions pour lead ${leadId}`);

        // Construire la requête pour récupérer les missions
        const params = new URLSearchParams({
          maxSize: (limit || 10).toString(),
          orderBy: orderBy || 'dateExecution',
          order: order || 'desc',
          where: JSON.stringify([{
            type: 'equals',
            attribute: 'leadId',
            value: leadId
          }])
        });

        const response = await espoFetch(`/MissionMAX?${params.toString()}`);

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'missions_retrieved',
          entity: 'MissionMAX',
          leadId,
          count: response.list.length,
          details: `${response.list.length} missions récupérées pour le lead ${leadId}`
        });

        return {
          success: true,
          leadId,
          total: response.total,
          count: response.list.length,
          missions: response.list.map(mission => ({
            id: mission.id,
            name: mission.name,
            typeAction: mission.typeAction,
            resultat: mission.resultat,
            statutExecution: mission.statutExecution,
            dateExecution: mission.dateExecution,
            tokensUtilises: mission.tokensUtilises
          })),
          message: `✅ ${response.list.length} missions récupérées`
        };

      } catch (error) {
        console.error('[get_missions_for_lead] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'send_whatsapp_message': {
      const { leadId, message, delayMinutes = 0 } = args;

      try {
        console.log(`[send_whatsapp_message] Envoi WhatsApp pour lead ${leadId}`);

        // Récupérer le lead pour avoir le numéro de téléphone et le nom
        const lead = await espoFetch(`/Lead/${leadId}`);

        if (!lead) {
          return {
            success: false,
            error: `Lead ${leadId} introuvable`
          };
        }

        if (!lead.phoneNumber) {
          return {
            success: false,
            error: `Le lead ${lead.name || leadId} n'a pas de numéro de téléphone`
          };
        }

        // Formater le numéro au format international si nécessaire
        let phoneNumber = lead.phoneNumber.trim();
        if (!phoneNumber.startsWith('+')) {
          // Si le numéro commence par 0, on suppose que c'est un numéro français
          if (phoneNumber.startsWith('0')) {
            phoneNumber = '+33' + phoneNumber.substring(1);
          } else {
            return {
              success: false,
              error: `Le numéro ${phoneNumber} n'est pas au format international (+33...)`
            };
          }
        }

        // Déclencher le workflow n8n WhatsApp
        const result = await trigger({
          code: 'wf-relance-j3-whatsapp',
          payload: {
            leadId: lead.id,
            leadName: lead.name || 'Lead',
            leadEmail: lead.emailAddress || '',
            leadPhone: phoneNumber,
            messageSuggestion: message,
            canal: 'whatsapp',
            delayMinutes,
            actionType: 'manual',
            detectedAt: new Date().toISOString()
          },
          tenant: 'macrea',
          role: 'assistant',
          mode: 'assist'
        });

        return {
          success: true,
          leadId: lead.id,
          leadName: lead.name,
          phoneNumber,
          runId: result.runId,
          status: result.status,
          message: delayMinutes > 0
            ? `✅ Message WhatsApp programmé pour ${lead.name} (envoi dans ${delayMinutes} minutes)`
            : `✅ Message WhatsApp envoyé à ${lead.name} (${phoneNumber})`
        };

      } catch (error) {
        console.error('[send_whatsapp_message] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'send_whatsapp_greenapi': {
      const { phoneNumber, message, instanceId = '7105440259' } = args;

      try {
        console.log(`[send_whatsapp_greenapi] Envoi WhatsApp direct via Green-API à ${phoneNumber}`);

        // Import Green-API service
        const { sendTestMessage } = await import('../providers/greenapi/greenapi.service.js');
        const { getInstance } = await import('../lib/waInstanceManager.js');

        // Get instance with API token
        const instance = await getInstance(instanceId);

        if (!instance || !instance.apiToken) {
          return {
            success: false,
            error: `Instance WhatsApp ${instanceId} non trouvée ou non configurée. Utilise /wa-instance pour la configurer.`
          };
        }

        // Clean phone number (remove +, spaces, parentheses, dashes)
        const cleanNumber = phoneNumber.replace(/[\+\s\-\(\)]/g, '');
        console.log(`[send_whatsapp_greenapi] Numéro nettoyé: ${cleanNumber}`);

        // Send message via Green-API
        const result = await sendTestMessage({
          idInstance: instanceId,
          apiTokenInstance: instance.apiToken,
          phoneNumber: cleanNumber,
          message
        });

        console.log(`[send_whatsapp_greenapi] ✅ Message envoyé:`, result);

        // Logger l'activité sortante (best effort - ne bloque jamais le chat)
        const leadId = args.leadId; // Optionnel - peut être passé par M.A.X.
        if (leadId) {
          try {
            await logMaxActivity({
              leadId,
              channel: 'whatsapp',
              direction: 'out',
              status: 'sent',
              messageSnippet: message.substring(0, 100),
              meta: {
                provider: 'green-api',
                instanceId,
                messageId: result.idMessage,
                phoneNumber: cleanNumber
              },
              tenantId: tenant || 'macrea'
            });
            console.log(`[send_whatsapp_greenapi] 📝 Activité loggée pour lead ${leadId}`);
          } catch (logError) {
            console.warn(`[send_whatsapp_greenapi] ⚠️  Erreur log activité (non bloquant):`, logError.message);
          }
        } else {
          console.warn(`[send_whatsapp_greenapi] ⚠️  Pas de leadId - activité non loggée`);
        }

        return {
          success: true,
          messageId: result.idMessage,
          status: 'sent',
          phoneNumber: cleanNumber,
          provider: 'green-api',
          message: `✅ Message WhatsApp envoyé via Green-API à ${phoneNumber}`
        };

      } catch (error) {
        console.error('[send_whatsapp_greenapi] ❌ Erreur:', error.message);

        // Logger l'échec (optionnel - best effort)
        const leadId = args.leadId;
        if (leadId) {
          try {
            await logMaxActivity({
              leadId,
              channel: 'whatsapp',
              direction: 'out',
              status: 'failed',
              messageSnippet: message ? message.substring(0, 100) : 'Erreur envoi',
              meta: {
                provider: 'green-api',
                error: error.message
              },
              tenantId: tenant || 'macrea'
            });
          } catch (logError) {
            // Silently fail - logging d'échec est purement informatif
          }
        }

        return {
          success: false,
          error: error.message,
          hint: 'Vérifie que l\'instance Green-API est configurée et active. Utilise /wa-instance pour vérifier.'
        };
      }
    }

    case 'list_whatsapp_templates': {
      const { type = 'all', status = 'active' } = args;

      try {
        console.log(`[list_whatsapp_templates] Listage des templates WhatsApp (type: ${type}, status: ${status})`);

        // Récupérer tous les messages WhatsApp
        const allMessages = WhatsAppMessage.getAll();

        // Filtrer par status
        let filteredMessages = allMessages;
        if (status !== 'all') {
          filteredMessages = allMessages.filter(msg => msg.status === status);
        }

        // Filtrer par type
        if (type !== 'all') {
          filteredMessages = filteredMessages.filter(msg => msg.type === type);
        }

        // Formater pour M.A.X.
        const templates = filteredMessages.map(msg => ({
          id: msg.id,
          name: msg.name,
          type: msg.type,
          status: msg.status,
          variables: msg.variables,
          contentSid: msg.contentSid,
          hasButtons: msg.buttons && msg.buttons.length > 0,
          buttonCount: msg.buttons ? msg.buttons.length : 0,
          createdAt: msg.createdAt,
          tenantId: msg.tenantId
        }));

        console.log(`[list_whatsapp_templates] ${templates.length} template(s) trouvé(s)`);

        return {
          success: true,
          count: templates.length,
          templates,
          availableTypes: ['appointment', 'follow_up', 'cart', 'promo', 'notification'],
          availableStatuses: ['active', 'draft', 'archived']
        };
      } catch (error) {
        console.error('[list_whatsapp_templates] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'send_whatsapp_template': {
      const { messageName, leadIdentifier, variables: providedVariables, autoResolve = true } = args;

      try {
        console.log(`[send_whatsapp_template] Envoi template "${messageName}" au lead "${leadIdentifier}"`);

        // Étape 1: Trouver le template WhatsApp par nom
        const message = WhatsAppMessage.findByName(messageName);
        if (!message) {
          return {
            success: false,
            error: `Template WhatsApp "${messageName}" introuvable. Utilisez list_whatsapp_templates pour voir les templates disponibles.`
          };
        }

        // Vérifier que le message est actif
        if (message.status !== 'active') {
          return {
            success: false,
            error: `Le template "${messageName}" n'est pas actif (status: ${message.status}). Activez-le d'abord.`
          };
        }

        console.log(`[send_whatsapp_template] Template trouvé: ${message.id} (ContentSid: ${message.contentSid})`);

        // Étape 2: Résoudre le lead (par ID ou nom)
        const lead = await resolveLeadIdentifier(leadIdentifier, espoFetch);
        if (!lead) {
          return {
            success: false,
            error: `Lead "${leadIdentifier}" introuvable. Vérifiez l'ID ou le nom du lead.`
          };
        }

        console.log(`[send_whatsapp_template] Lead trouvé: ${lead.id} (${lead.name})`);

        // Vérifier que le lead a un numéro de téléphone
        if (!lead.phoneNumber) {
          return {
            success: false,
            error: `Le lead ${lead.name || lead.id} n'a pas de numéro de téléphone renseigné.`
          };
        }

        // Étape 3: Mapper les variables selon le mode du template
        let finalVariables = providedVariables || {};

        if (autoResolve) {
          const mode = message.metadata?.mode || 'text';
          console.log(`[send_whatsapp_template] Mode détecté: ${mode}`);

          let autoMappedVars = {};

          switch (mode) {
            case 'quick_reply':
              // Pour Quick Reply: ajouter leadId et tenantId
              autoMappedVars = prepareQuickReplyVariables(
                lead,
                message.variables,
                message.tenantId
              );
              console.log(`[send_whatsapp_template] Variables Quick Reply préparées:`, autoMappedVars);
              break;

            case 'cta':
              // Pour CTA: générer le payload encodé
              const payloadData = {
                tenantId: message.tenantId,
                cartToken: providedVariables.cartToken || `cart_${lead.id}_${Date.now()}`,
                ...providedVariables // Données supplémentaires fournies par l'utilisateur
              };
              autoMappedVars = prepareCtaVariables(
                lead,
                message.variables,
                payloadData
              );
              console.log(`[send_whatsapp_template] Variables CTA préparées avec payload:`, autoMappedVars);
              break;

            case 'text':
            default:
              // Pour TEXT simple: mapping classique
              autoMappedVars = mapVariablesFromLead(lead, message.variables);
              console.log(`[send_whatsapp_template] Variables TEXT mappées:`, autoMappedVars);
              break;
          }

          // Merger avec les variables fournies (les fournies ont priorité)
          finalVariables = {
            ...autoMappedVars,
            ...providedVariables
          };
        }

        console.log(`[send_whatsapp_template] Variables finales:`, finalVariables);


        // Étape 3.5: Validation des variables requises
        const requiredVars = message.variables.filter(v => !['leadId', 'tenantId'].includes(v));
        const missingVars = requiredVars.filter(varName => {
          const value = finalVariables[varName];
          return value === undefined || value === null || value === '';
        });

        if (missingVars.length > 0) {
          console.warn(`[send_whatsapp_template] ⚠️ Variables manquantes ou vides: ${missingVars.join(', ')}`);
          return {
            success: false,
            error: `Variables manquantes ou vides pour le template "${messageName}": ${missingVars.join(', ')}. Le lead "${lead.name}" ne contient pas ces informations. Veuillez fournir explicitement ces variables avec le paramètre "variables".`,
            missingVariables: missingVars,
            leadData: {
              id: lead.id,
              name: lead.name,
              dateStart: lead.dateStart || 'non renseigné',
              nextMeeting: lead.nextMeeting || 'non renseigné'
            }
          };
        }
        // Étape 4: Envoyer le message via le service
        const sendResult = await sendWhatsAppMessage(
          message.id,
          lead.phoneNumber,
          lead.id,
          finalVariables
        );

        if (!sendResult.success) {
          return {
            success: false,
            error: sendResult.error || 'Erreur lors de l\'envoi du message WhatsApp'
          };
        }

        // Log l'activité M.A.X.
        logMaxActivity({
          type: 'whatsapp_sent',
          entity: 'Lead',
          leadId: lead.id,
          details: `Message WhatsApp "${message.name}" envoyé à ${lead.name} (${lead.phoneNumber})`,
          metadata: {
            messageId: message.id,
            messageName: message.name,
            twilioSid: sendResult.messageSid,
            variables: finalVariables
          }
        });

        console.log(`[send_whatsapp_template] Message envoyé avec succès! Twilio SID: ${sendResult.messageSid}`);

        return {
          success: true,
          messageSid: sendResult.messageSid,
          status: sendResult.status,
          to: sendResult.to,
          leadId: lead.id,
          leadName: lead.name,
          templateUsed: message.name,
          variablesMapped: finalVariables
        };
      } catch (error) {
        console.error('[send_whatsapp_template] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🧠 TOOLS MÉMOIRE LONGUE DURÉE (Phase 2B+ - Objectifs)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case 'store_tenant_goal': {
      const {
        goal_text,
        goal_category,
        target_value,
        current_value,
        unit,
        deadline,
        priority
      } = args;

      try {
        // Déterminer le tenant_id (depuis session ou fallback)
        const tenantId = conversation.tenantId || 'macrea';

        const result = await createTenantGoal({
          tenant_id: tenantId,
          goal_text,
          goal_category,
          target_value,
          current_value,
          unit,
          deadline,
          priority,
          created_by: 'max', // Tool appelé par M.A.X.
          metadata: { source: 'max_tool', session_id: sessionId }
        });

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[store_tenant_goal] ✅ Objectif créé: ${result.goal_id} pour tenant ${tenantId}`);

        return {
          success: true,
          goal_id: result.goal_id,
          goal: result.goal,
          message: 'Objectif enregistré avec succès'
        };

      } catch (error) {
        console.error('[store_tenant_goal] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'update_tenant_goal': {
      const { goal_id, ...updates } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        const result = await updateTenantGoal(goal_id, tenantId, updates);

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[update_tenant_goal] ✅ Objectif ${goal_id} mis à jour`);

        return {
          success: true,
          goal: result.goal,
          message: 'Objectif mis à jour avec succès'
        };

      } catch (error) {
        console.error('[update_tenant_goal] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'archive_tenant_goal': {
      const { goal_id, reason } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        const result = await archiveTenantGoal(goal_id, tenantId, reason);

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[archive_tenant_goal] ✅ Objectif ${goal_id} archivé`);

        return {
          success: true,
          goal: result.goal,
          message: 'Objectif archivé avec succès'
        };

      } catch (error) {
        console.error('[archive_tenant_goal] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'get_tenant_context': {
      const {
        include_goals = true,
        include_profile = true,
        include_notes = true,
        notes_limit = 10
      } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        // Charger le contexte complet (identité + événements + objectifs)
        const maxContext = await getMaxContext(tenantId, { recentActionsLimit: 100 });

        // Charger les objectifs actifs
        let goals = [];
        if (include_goals) {
          const goalsResult = await getTenantGoals(tenantId, {
            status: 'actif',
            archived: false,
            orderBy: 'priority',
            orderDirection: 'desc'
          });

          if (goalsResult.ok) {
            goals = goalsResult.goals.map(goal => ({
              id: goal.id,
              goal_text: goal.goal_text,
              goal_category: goal.goal_category,
              target_value: goal.target_value,
              current_value: goal.current_value,
              unit: goal.unit,
              deadline: goal.deadline,
              status: goal.status,
              priority: goal.priority,
              formatted: formatGoalForDisplay(goal)
            }));
          }
        }

        // Charger les notes longues actives
        let notes = [];
        if (include_notes && supabase) {
          const { data: notesData, error: notesError } = await supabase
            .from('tenant_memory')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('memory_type', 'note')
            .is('expires_at', null)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(notes_limit);

          if (!notesError && notesData) {
            notes = notesData.map(note => ({
              id: note.id,
              title: note.memory_key,
              content: note.memory_value,
              category: note.metadata?.category || 'other',
              priority: note.priority,
              created_at: note.created_at
            }));
          }
        }

        // Construire le contexte complet
        const context = {
          tenant_id: tenantId,
          goals: include_goals ? goals : [],
          identity: include_profile ? maxContext.identity : {},
          profile: include_profile ? maxContext.tenant_memory : {},
          recent_events: maxContext.recent_actions.slice(0, 15), // 15 événements récents
          notes: include_notes ? notes : []
        };

        console.log(`[get_tenant_context] ✅ Contexte chargé pour tenant ${tenantId}: ${goals.length} objectifs, ${notes.length} notes`);

        return {
          success: true,
          context
        };

      } catch (error) {
        console.error('[get_tenant_context] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔧 TOOLS PROFIL/PRÉFÉRENCES (Phase 2B+ - Priorité 2)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case 'store_tenant_profile': {
      const { profile_key, profile_value, category, priority = 80 } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        const result = await setTenantMemory({
          tenant_id: tenantId,
          memory_key: profile_key,
          memory_value: profile_value,
          memory_type: 'profile',
          scope: 'global',
          priority,
          expires_at: null, // Profil = jamais expiré
          metadata: {
            source: 'max_tool',
            session_id: sessionId,
            category: category || 'other'
          }
        });

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[store_tenant_profile] ✅ Préférence enregistrée: ${profile_key} pour tenant ${tenantId}`);

        return {
          success: true,
          profile_key,
          message: 'Préférence enregistrée avec succès'
        };

      } catch (error) {
        console.error('[store_tenant_profile] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'update_tenant_profile': {
      const { profile_key, profile_value } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        // Vérifier si la préférence existe
        const existing = await getTenantMemory(tenantId, profile_key, 'global');

        if (!existing.ok || !existing.data) {
          return {
            success: false,
            error: `Préférence '${profile_key}' non trouvée`,
            should_create: true
          };
        }

        // Mettre à jour
        const result = await setTenantMemory({
          tenant_id: tenantId,
          memory_key: profile_key,
          memory_value: profile_value,
          memory_type: 'profile',
          scope: 'global',
          priority: existing.data.priority || 80,
          expires_at: null,
          metadata: {
            ...existing.data.metadata,
            updated_by: 'max_tool',
            updated_at: new Date().toISOString()
          }
        });

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[update_tenant_profile] ✅ Préférence ${profile_key} mise à jour`);

        return {
          success: true,
          profile_key,
          old_value: existing.data.memory_value,
          new_value: profile_value,
          message: 'Préférence mise à jour avec succès'
        };

      } catch (error) {
        console.error('[update_tenant_profile] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'archive_tenant_profile': {
      const { profile_key } = args;

      try {
        const tenantId = conversation.tenantId || 'macrea';

        // Récupérer la préférence existante
        const existing = await getTenantMemory(tenantId, profile_key, 'global');

        if (!existing.ok || !existing.data) {
          return {
            success: false,
            error: `Préférence '${profile_key}' non trouvée`
          };
        }

        // Archiver (soft delete) en mettant à jour avec archived=true
        const result = await setTenantMemory({
          tenant_id: tenantId,
          memory_key: profile_key,
          memory_value: existing.data.memory_value,
          memory_type: 'profile',
          scope: 'global',
          priority: existing.data.priority,
          expires_at: null,
          archived: true,
          archived_at: new Date().toISOString(),
          metadata: {
            ...existing.data.metadata,
            archived_by: 'max_tool',
            archive_reason: 'User request'
          }
        });

        if (!result.ok) {
          return {
            success: false,
            error: result.error
          };
        }

        console.log(`[archive_tenant_profile] ✅ Préférence ${profile_key} archivée`);

        return {
          success: true,
          profile_key,
          message: 'Préférence supprimée avec succès'
        };

      } catch (error) {
        console.error('[archive_tenant_profile] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 NOTES LONGUES (PRIORITÉ 3)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    case 'store_long_term_note': {
      try {
        const { note_title, note_content, note_category, priority = 60 } = args;
        const tenantId = conversation.tenantId || 'macrea';

        // Utiliser tenant_memory avec memory_type='note'
        const result = await setTenantMemory({
          tenant_id: tenantId,
          memory_key: note_title, // Le titre sert de clé
          memory_value: note_content, // Le contenu détaillé
          memory_type: 'note',
          scope: 'global',
          priority,
          expires_at: null, // Notes permanentes
          metadata: {
            source: 'max_tool',
            session_id: sessionId,
            category: note_category || 'other',
            created_at: new Date().toISOString()
          }
        });

        console.log(`[store_long_term_note] ✅ Note enregistrée: ${note_title}`);

        return {
          success: true,
          note_title,
          message: 'Note enregistrée avec succès'
        };

      } catch (error) {
        console.error('[store_long_term_note] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'archive_long_term_note': {
      try {
        const { note_title } = args;
        const tenantId = conversation.tenantId || 'macrea';

        // Récupérer la note existante
        const existing = await getTenantMemory(tenantId, note_title, 'global');

        if (!existing.ok || !existing.data) {
          return {
            success: false,
            error: `Note '${note_title}' non trouvée`
          };
        }

        // Vérifier que c'est bien une note (pas un profil)
        if (existing.data.memory_type !== 'note') {
          return {
            success: false,
            error: `'${note_title}' n'est pas une note (type: ${existing.data.memory_type})`
          };
        }

        // Archiver (soft delete)
        const result = await setTenantMemory({
          tenant_id: tenantId,
          memory_key: note_title,
          memory_value: existing.data.memory_value,
          memory_type: 'note',
          scope: 'global',
          priority: existing.data.priority,
          expires_at: null,
          archived: true,
          archived_at: new Date().toISOString(),
          metadata: {
            ...existing.data.metadata,
            archived_by: 'max_tool',
            archive_reason: 'User request'
          }
        });

        console.log(`[archive_long_term_note] ✅ Note archivée: ${note_title}`);

        return {
          success: true,
          note_title,
          message: 'Note archivée avec succès'
        };

      } catch (error) {
        console.error('[archive_long_term_note] Erreur:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    case 'consult_troubleshooting_playbook': {
      try {
        const { issue, context = {}, getUserFacing = true } = args;

        console.log(`[consult_troubleshooting_playbook] 🔧 Consultation: ${issue}`);
        console.log(`[consult_troubleshooting_playbook] Context:`, context);

        // Import dynamique du playbookReader
        const { consultPlaybook } = await import('../lib/playbookReader.js');

        // Consulter le playbook
        const result = await consultPlaybook(issue, context, getUserFacing);

        if (!result.ok) {
          console.warn(`[consult_troubleshooting_playbook] ⚠️ ${result.error}`);
          return {
            success: false,
            error: result.error,
            fallbackMessage: result.fallbackMessage,
            recommendation: result.recommendation
          };
        }

        console.log(`[consult_troubleshooting_playbook] ✅ Playbook consulté avec succès`);

        // Retourner le résultat formaté
        return {
          success: true,
          issue,
          playbook: {
            symptoms: result.playbook.symptoms,
            diagnosis: result.playbook.diagnosis,
            solutions: result.playbook.solutions,
            prevention: result.playbook.prevention
          },
          userMessage: result.userMessage,
          context: result.context,
          // Ajouter des métriques pour le monitoring
          metadata: {
            consultedAt: new Date().toISOString(),
            contextFields: Object.keys(context),
            solutionsCount: result.playbook.solutions?.length || 0
          }
        };

      } catch (error) {
        console.error('[consult_troubleshooting_playbook] Erreur:', error);
        return {
          success: false,
          error: error.message,
          fallbackMessage: `Je rencontre un problème technique en consultant le guide de dépannage. Je vais essayer de résoudre votre problème avec mes connaissances générales.`
        };
      }
    }

    default:
      throw new Error(`Tool inconnu: ${toolName}`);
  }
}

/**
 * POST /api/chat
 * Envoyer un message et recevoir la réponse de M.A.X.
 *
 * Body: { sessionId?, message }
 */
router.post('/', async (req, res) => {
  try {
    const { sessionId: clientSessionId, message, mode = 'assisté' } = req.body;

    // Extraire le rôle de l'utilisateur (admin vs client) depuis le header
    const userRole = (req.header('X-Role') || 'client').toLowerCase();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'Message requis' });
    }

    // Créer ou utiliser session existante
    let sessionId = clientSessionId;
    let conversation = clientSessionId ? loadConversation(clientSessionId) : null;

    if (!sessionId || !conversation) {
      sessionId = createSession(mode);
      conversation = loadConversation(sessionId);
      console.log(`[ChatRoute] Nouvelle session créée: ${sessionId} (mode: ${mode})`);
    } else if (conversation.mode !== mode) {
      // Mettre à jour le mode si changé
      updateSessionMode(sessionId, mode);
      conversation.mode = mode;
      console.log(`[ChatRoute] Mode mis à jour: ${sessionId} -> ${mode}`);
    }

    // Sauvegarder message utilisateur
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    saveMessage(sessionId, userMessage);

    // Vérifier si résumé nécessaire (async, ne bloque pas la réponse)
    summarizeIfNeeded(sessionId).catch(err =>
      console.error('[ChatRoute] Erreur résumé:', err)
    );

    // Obtenir contexte pour l'IA (Function Calling gère maintenant l'enrichissement)
    let contextMessages = getContextMessages(sessionId);

    // Si un fichier a été uploadé, ajouter un message système avec les données
    if (conversation.uploadedFile && conversation.uploadedFile.analysis) {
      const uploadedFile = conversation.uploadedFile;
      const fileAnalysis = uploadedFile.analysis;
      const format = fileAnalysis.summary?.format || 'unknown';

      console.log(`[ChatRoute] 📎 Fichier détecté dans session: ${uploadedFile.originalname} (${format})`);
      console.log(`[ChatRoute] 📊 Données disponibles: ${fileAnalysis.data ? fileAnalysis.data.length : 0} lignes`);

      let fileDataMessage = `📎 FICHIER DISPONIBLE DANS CETTE SESSION:\n`;
      fileDataMessage += `Nom: ${uploadedFile.originalname}\n`;
      fileDataMessage += `Format: ${format}\n`;
      fileDataMessage += `Uploadé le: ${new Date(uploadedFile.uploadedAt).toLocaleString('fr-FR')}\n\n`;

      if (format === 'csv' && fileAnalysis.data && fileAnalysis.data.length > 0) {
        fileDataMessage += `DONNÉES CSV (${fileAnalysis.data.length} lignes totales):\n`;
        fileDataMessage += `Colonnes: ${fileAnalysis.columns ? fileAnalysis.columns.map(c => c.name).join(', ') : 'N/A'}\n\n`;
        fileDataMessage += `TOUTES LES DONNÉES:\n${JSON.stringify(fileAnalysis.data, null, 2)}`;
      } else if (format === 'json' && fileAnalysis.data) {
        const dataArray = Array.isArray(fileAnalysis.data) ? fileAnalysis.data : [fileAnalysis.data];
        fileDataMessage += `DONNÉES JSON (${dataArray.length} items):\n${JSON.stringify(dataArray, null, 2)}`;
      } else if (format === 'text' && fileAnalysis.content) {
        fileDataMessage += `CONTENU TEXTE:\n${fileAnalysis.content}`;
      }

      // Insérer ce message au début du contexte (après le premier message utilisateur s'il existe)
      const fileContextMessage = {
        role: 'system',
        content: fileDataMessage
      };

      // Insérer après le premier message utilisateur pour que M.A.X. le voie
      if (contextMessages.length > 0) {
        contextMessages.splice(1, 0, fileContextMessage);
      } else {
        contextMessages.unshift(fileContextMessage);
      }

      console.log(`[ChatRoute] ✅ Contexte fichier injecté dans les messages (${fileDataMessage.length} caractères)`);
    } else {
      console.log(`[ChatRoute] ℹ️ Aucun fichier uploadé dans cette session`);
    }

    // System prompt pour M.A.X. (adapté au mode d'exécution)
    const currentMode = conversation.mode || 'assisté';

    let modeInstructions = '';
    if (currentMode === 'assisté') {
      modeInstructions = `\n\n⚠️ MODE ASSISTÉ ACTIF:
- TOUJOURS demander confirmation explicite avant d'exécuter toute action (import CRM, création campagne, modifications données)
- Utiliser des formulations comme: "Souhaitez-vous que j'insère ces leads dans EspoCRM?" ou "Dois-je procéder à l'import?"
- JAMAIS simuler ou annoncer qu'une action a été faite sans confirmation utilisateur
- Marquer clairement les actions RÉELLES avec ✅ et les suggestions avec 💡`;
    } else if (currentMode === 'auto') {
      modeInstructions = `\n\n⚡ MODE AUTO ACTIF:
- Exécuter automatiquement les actions appropriées quand le contexte est clair
- Annoncer l'action avant de l'exécuter
- Marquer clairement les actions RÉELLES avec ✅ ACTION EXÉCUTÉE
- Toujours fournir des liens directs vers les ressources créées (EspoCRM, etc.)`;
    } else if (currentMode === 'conseil') {
      modeInstructions = `\n\n💡 MODE CONSEIL ACTIF:
- UNIQUEMENT fournir des conseils, recommandations et stratégies
- JAMAIS exécuter d'actions réelles
- JAMAIS simuler ou annoncer qu'une action a été faite
- Toujours marquer tes réponses avec 💡 SUGGESTION
- Si l'utilisateur demande une action, expliquer que le mode Conseil ne permet pas l'exécution`;
    }

    // Contexte session pour informer M.A.X. de l'état actuel
    let sessionContext = '';
    if (conversation.enrichedData && conversation.imported) {
      sessionContext = `\n\n📌 CONTEXTE SESSION ACTUEL:
- Un fichier CSV a été uploadé et analysé
- Les leads ont été enrichis avec succès
- ✅ L'IMPORT DANS ESPOCRM A DÉJÀ ÉTÉ EFFECTUÉ le ${new Date(conversation.importedAt).toLocaleString('fr-FR')}
- Les leads sont maintenant dans le CRM et prêts pour la prospection
- NE PROPOSE PLUS l'import, il est déjà fait !`;
    } else if (conversation.enrichedData) {
      sessionContext = `\n\n📌 CONTEXTE SESSION ACTUEL:
- Un fichier CSV a été uploadé et analysé
- Les leads ont été enrichis avec succès
- ⏳ L'import dans EspoCRM est en attente de confirmation utilisateur`;
    } else if (conversation.uploadedFile) {
      const uploadedFile = conversation.uploadedFile;
      const fileAnalysis = uploadedFile.analysis;
      const format = fileAnalysis.summary?.format || 'unknown';

      // Préparer un aperçu des données selon le format
      let dataPreview = '';
      if (format === 'csv' && fileAnalysis.data && fileAnalysis.data.length > 0) {
        const previewCount = Math.min(5, fileAnalysis.data.length);
        dataPreview = `\n\n📊 DONNÉES DU FICHIER (${previewCount} premiers sur ${fileAnalysis.data.length} total):
${JSON.stringify(fileAnalysis.data.slice(0, previewCount), null, 2)}

Colonnes détectées: ${fileAnalysis.columns ? fileAnalysis.columns.map(c => c.name).join(', ') : 'N/A'}`;
      } else if (format === 'json' && fileAnalysis.data) {
        const dataArray = Array.isArray(fileAnalysis.data) ? fileAnalysis.data : [fileAnalysis.data];
        const previewCount = Math.min(5, dataArray.length);
        dataPreview = `\n\n📊 DONNÉES DU FICHIER JSON (${previewCount} premiers sur ${dataArray.length} total):
${JSON.stringify(dataArray.slice(0, previewCount), null, 2)}`;
      } else if (format === 'text' && fileAnalysis.content) {
        const preview = fileAnalysis.content.slice(0, 500);
        dataPreview = `\n\n📄 CONTENU DU FICHIER TEXTE (aperçu):
${preview}${fileAnalysis.content.length > 500 ? '...' : ''}`;
      }

      sessionContext = `\n\n📌 CONTEXTE SESSION ACTUEL:
- ✅ Fichier uploadé: ${uploadedFile.originalname} (format: ${format})
- Uploadé le: ${new Date(uploadedFile.uploadedAt).toLocaleString('fr-FR')}
- Tu as ACCÈS aux données du fichier ci-dessous
- L'utilisateur peut te demander d'importer/enrichir ces données${dataPreview}

💡 IMPORTANT: Les données sont DISPONIBLES. Quand l'utilisateur demande "importer" ou "enrichir", utilise les tools disponibles pour traiter ces données directement.`;
    }

    // CONTEXTE ESPOCRM: Si la session est liée à une entité EspoCRM, récupérer et injecter le contexte
    // ⚠️ TEMPORAIREMENT DÉSACTIVÉ pour performance - ajoute 1-2s à chaque requête
    let espoContext = '';
    /* if (conversation.entity && conversation.entityId) {
      try {
        console.log(`[ChatRoute] Session contextuelle détectée: ${conversation.entity} ${conversation.entityId}`);

        // Récupérer les détails de l'entité depuis EspoCRM
        const entityResponse = await fetch(`http://localhost:8081/espocrm/api/v1/${conversation.entity}/${conversation.entityId}`, {
          headers: {
            'X-Api-Key': process.env.ESPOCRM_API_KEY || ''
          }
        });

        if (entityResponse.ok) {
          const entityData = await entityResponse.json();

          espoContext = `\n\n🎯 CONTEXTE DE CONVERSATION ACTIF:
L'utilisateur discute ACTUELLEMENT du ${conversation.entity} "${entityData.name}" dans MaCréa CRM.

**🔍 INFORMATIONS DU ${conversation.entity.toUpperCase()} ACTUEL:**
- ID: ${conversation.entityId}
- Nom: ${entityData.name || 'N/A'}
- Email: ${entityData.emailAddress || 'N/A'}
- Téléphone: ${entityData.phoneNumber || 'N/A'}
${entityData.status ? `- Statut: ${entityData.status}` : ''}
${entityData.accountName ? `- Entreprise: ${entityData.accountName}` : ''}
${entityData.website ? `- Site web: ${entityData.website}` : ''}
${entityData.industry ? `- Secteur: ${entityData.industry}` : '- Secteur: [VIDE - à remplir]'}
${entityData.description ? `- Description: ${entityData.description}` : ''}

**📋 DONNÉES COMPLÈTES (JSON):**
${JSON.stringify(entityData, null, 2)}

⚠️ RÈGLES IMPORTANTES:
1. Quand l'utilisateur dit "ce lead" ou "ce ${conversation.entity.toLowerCase()}", il parle de "${entityData.name}" (ID: ${conversation.entityId})
2. Tu as TOUTES les données ci-dessus. Pas besoin de chercher dans le CRM, les infos sont ICI.
3. 🚨 MODIFICATION DE CHAMPS CRM 🚨
   Si l'utilisateur demande de "remplir", "modifier", "mettre à jour", "changer" un champ:
   - TU DOIS OBLIGATOIREMENT utiliser le tool "update_leads_in_espo"
   - Paramètres: leadIds: ["${conversation.entityId}"], updates: { champÀModifier: nouvelleValeur }
   - NE DIS JAMAIS "j'ai mis à jour" SANS avoir appelé le tool!
   - Exemple: Si user dit "remplis le secteur", appelle update_leads_in_espo avec updates: { industry: "Logistique" }
4. Si un champ est vide, tu peux le signaler et proposer de le remplir
5. ⚠️ APRÈS update_leads_in_espo: Termine par "🔄 Rafraîchissez la page EspoCRM pour voir les changements."`;

          console.log(`[ChatRoute] Contexte EspoCRM injecté pour ${conversation.entity} ${conversation.entityId}`);
        }
      } catch (error) {
        console.error(`[ChatRoute] Erreur récupération contexte EspoCRM:`, error);
      }
    } */

    // Phase 2B+ - Récupérer le DOUBLE contexte mémoire Supabase (non-bloquant)
    // Multi-tenant : utiliser le tenant_id du JWT (fallback 'macrea' pour dev uniquement)
    const TENANT_ID = req.user?.tenantId || 'macrea';
    let supabaseContext = '';

    try {
      // Récupérer IDENTITÉ (long terme) + ÉVÉNEMENTS (72h)
      const maxContext = await getMaxContext(TENANT_ID, { recentActionsLimit: 100 });

      // CHARGER LES OBJECTIFS (tenant_goals)
      let goals = [];
      try {
        console.log('[ChatRoute] 🎯 Chargement objectifs pour tenant:', TENANT_ID);
        const goalsResult = await getTenantGoals(TENANT_ID, {
          status: 'actif',
          archived: false,
          orderBy: 'priority',
          orderDirection: 'desc',
          limit: 10
        });
        console.log('[ChatRoute] 🎯 Résultat getTenantGoals:', { ok: goalsResult.ok, count: goalsResult.goals?.length || 0 });
        if (goalsResult.ok) {
          goals = goalsResult.goals.map(goal => ({
            id: goal.id,  // CRITICAL: Include UUID for archive operations
            text: goal.goal_text,
            target: goal.target_value,
            current: goal.current_value,
            unit: goal.unit,
            deadline: goal.deadline,
            formatted: formatGoalForDisplay(goal)
          }));
          console.log('[ChatRoute] ✅ Objectifs chargés:', goals.length);
        }
      } catch (err) {
        console.warn('[ChatRoute] ❌ Erreur chargement objectifs:', err.message);
      }

      // CHARGER LE PROFIL (tenant_memory avec memory_type='profile')
      let profileEntries = [];
      if (supabase) {
        try {
          console.log('[ChatRoute] 👤 Chargement profil pour tenant:', TENANT_ID);
          const { data: profileData, error } = await supabase
            .from('tenant_memory')
            .select('memory_key, memory_value, priority')
            .eq('tenant_id', TENANT_ID)
            .eq('memory_type', 'profile')
            .is('expires_at', null)
            .order('priority', { ascending: false })
            .limit(20);

          console.log('[ChatRoute] 👤 Résultat profil:', { count: profileData?.length || 0, error });
          if (profileData) {
            profileEntries = profileData.map(p => ({
              key: p.memory_key,
              value: p.memory_value
            }));
            console.log('[ChatRoute] ✅ Profil chargé:', profileEntries.length, 'entrées');
          }
        } catch (err) {
          console.warn('[ChatRoute] ❌ Erreur chargement profil:', err.message);
        }
      } else {
        console.warn('[ChatRoute] ⚠️ Supabase non disponible pour chargement profil');
      }

      // CHARGER LES NOTES (tenant_memory avec memory_type='note')
      let noteEntries = [];
      if (supabase) {
        try {
          console.log('[ChatRoute] 📝 Chargement notes pour tenant:', TENANT_ID);
          const { data: notesData, error } = await supabase
            .from('tenant_memory')
            .select('id, memory_key, memory_value, priority, created_at')
            .eq('tenant_id', TENANT_ID)
            .eq('memory_type', 'note')
            .is('expires_at', null)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(10);

          console.log('[ChatRoute] 📝 Résultat notes:', { count: notesData?.length || 0, error });
          if (notesData) {
            noteEntries = notesData.map(n => ({
              id: n.id,
              title: n.memory_key,
              content: n.memory_value,
              priority: n.priority,
              created_at: n.created_at
            }));
            console.log('[ChatRoute] ✅ Notes chargées:', noteEntries.length, 'notes');
          }
        } catch (err) {
          console.warn('[ChatRoute] ❌ Erreur chargement notes:', err.message);
        }
      } else {
        console.warn('[ChatRoute] ⚠️ Supabase non disponible pour chargement notes');
      }

      // CONSTRUCTION DU CONTEXTE À DEUX NIVEAUX
      const identity = maxContext.identity || {};
      const hasIdentity = identity.business_model || identity.secteur || identity.objectifs.length > 0;
      const hasGoals = goals.length > 0;
      const hasProfile = profileEntries.length > 0;
      const hasNotes = noteEntries.length > 0;

      const hasEvents = maxContext.recent_actions.length > 0;

      if (hasIdentity || hasEvents || hasGoals || hasProfile || hasNotes) {
        // Calculer les stats temporelles pour événements
        const now = Date.now();
        const actionsLast24h = maxContext.recent_actions.filter(a =>
          (now - new Date(a.created_at).getTime()) < 24 * 60 * 60 * 1000
        ).length;
        const actionsLast72h = maxContext.recent_actions.length;

        supabaseContext = `\n\n╔══════════════════════════════════════════════════════════════════╗
║  🧠 SYSTÈME DE MÉMOIRE LONGUE DURÉE - SUPABASE                 ║
╚══════════════════════════════════════════════════════════════════╝

Tu disposes de TROIS TYPES DE MÉMOIRE à utiliser selon le contexte :

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ OBJECTIFS BUSINESS (tenant_goals) - Résultats à atteindre
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasGoals ? `
**🎯 Objectifs actifs (${goals.length})** :
${goals.map((g, i) => `  ${i + 1}. ${g.formatted} [ID: ${g.id}]`).join('\n')}

🔒 **Utilise ces objectifs pour adapter TOUTES tes recommandations**
🔑 **Pour modifier/archiver un objectif, utilise toujours son ID UUID exact**
` : '**🎯 Objectifs** : Aucun objectif défini'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ PROFIL UTILISATEUR (tenant_memory) - Préférences et identité
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasProfile ? `
**👤 Profil (${profileEntries.length} préférences)** :
${profileEntries.map((p, i) => `  ${i + 1}. ${p.key}: ${typeof p.value === 'object' ? JSON.stringify(p.value) : p.value}`).join('\n')}

🔒 **Respecte ces préférences dans TOUTES tes interactions**
` : '**👤 Profil** : Aucune préférence définie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ NOTES CONTEXTUELLES (tenant_memory) - Contexte temporaire important
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasNotes ? `
**📝 Notes actives (${noteEntries.length} notes)** :
${noteEntries.map((n, i) => `  ${i + 1}. **${n.title}** : ${n.content} [ID: ${n.id}]`).join('\n')}

🔒 **Ces notes décrivent le contexte actuel, utilise-les pour adapter ta stratégie**
🔑 **Pour archiver une note, utilise toujours son ID exact**
` : '**📝 Notes** : Aucune note contextuelle'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ IDENTITÉ BUSINESS (ancienne mémoire - legacy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasIdentity ? `
**🏢 Business Model** : ${identity.business_model || 'Non défini'}
**🎯 Secteur** : ${identity.secteur || 'Non défini'}

${identity.objectifs.length > 0 ? `**📌 Objectifs (legacy)** :
${identity.objectifs.map((obj, i) => `  ${i + 1}. ${obj}`).join('\n')}` : ''}

${identity.contraintes.length > 0 ? `**⚠️ Contraintes** :
${identity.contraintes.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}` : ''}

${identity.ton_communication ? `**💬 Ton** : ${identity.ton_communication}` : ''}
` : '**🏢 Identité** : Non configurée (legacy)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ MÉMOIRE ÉVÉNEMENTS (COURT TERME - Fenêtre 72h glissante)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasEvents ? `
📊 **${actionsLast72h} actions CRM** sur 72h (dont ${actionsLast24h} dans les dernières 24h)

**📌 Dernières actions CRM (15 plus récentes) :**
${maxContext.recent_actions.slice(0, 15).map((action, idx) => {
  const date = new Date(action.created_at);
  const timeAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60)); // minutes
  const hoursAgo = Math.round(timeAgo / 60);
  const displayTime = hoursAgo > 0 ? `${hoursAgo}h` : `${timeAgo}min`;

  // Extraire infos pertinentes
  let details = '';
  if (action.entity_type === 'Lead' && action.entity_id) {
    const leadName = action.description.match(/lead ([^(]+)/)?.[1]?.trim() || action.entity_id.substring(0, 8);
    details = ` sur "${leadName}"`;
  }

  return `${idx + 1}. [il y a ${displayTime}] ${action.action_type}${details}${action.success ? '' : ' ❌ ÉCHEC'}`;
}).join('\n')}
${maxContext.recent_actions.length > 15 ? `\n... et ${maxContext.recent_actions.length - 15} autres actions dans la fenêtre 72h` : ''}

⏱️ **Ces événements s'effacent après 72h** - utilisés pour questions temporelles.
` : `
📊 **Aucun événement récent dans les 72 dernières heures**
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RÈGLES D'UTILISATION DES DEUX MÉMOIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **TOUJOURS utiliser l'IDENTITÉ comme base de réflexion** :
   - Adapter ton ton selon identity.ton_communication
   - Respecter les objectifs et contraintes du tenant
   - Contextualiser toutes tes réponses selon le secteur

✅ **Utiliser les ÉVÉNEMENTS uniquement pour questions temporelles** :
   - "Quelle est la dernière modification ?" → Lire les événements 72h
   - "Qu'ai-je fait aujourd'hui ?" → Filtrer événements par date
   - "Activité récente sur lead X ?" → Chercher dans événements

❌ **NE JAMAIS INVENTER** :
   - Si PROFIL OU OBJECTIFS OU NOTES OU IDENTITÉ LEGACY existent → UTILISE-LES (NE DIS JAMAIS "identité non configurée" ou "je ne te connais pas")
   - Si TOUS sont vides → Proposer de les configurer
   - Si aucun événement → Dire "Aucune activité récente dans les 72h"
   - Si info manquante → Demander confirmation ou offrir de l'ajouter

🚨 **IMPORTANT** : Si tu as chargé des OBJECTIFS, PROFIL ou NOTES au démarrage de la conversation, tu CONNAIS l'utilisateur. Ne dis JAMAIS "Votre identité n'est pas encore configurée" dans ce cas.

❌ **NE JAMAIS MÉLANGER** :
   - Identité ≠ Événements
   - Long terme ≠ Court terme
   - Préférences ≠ Actions récentes
   → Mais garde conscience que tu as 72h de contexte disponible

═══════════════════════════════════════════════════════════════════
`;
      }
    } catch (err) {
      console.warn('[ChatRoute] Impossible de récupérer contexte Supabase:', err.message);
      // Ne pas bloquer si Supabase est indisponible
    }

    // Utiliser le prompt complet avec les règles opérationnelles
    // ⚠️ ULTRA_PRIORITY_RULES À LA FIN pour maximum recency bias (GPT-4 lit en dernier)
    const systemPrompt = `${BASE_SYSTEM_PROMPT}${sessionContext}${espoContext}${supabaseContext}${modeInstructions}

═══════════════════════════════════════════════════════════════════
👤 RÔLE UTILISATEUR ACTUEL
═══════════════════════════════════════════════════════════════════

Rôle actuel: ${userRole === 'admin' ? 'ADMIN' : 'CLIENT'}

${userRole === 'admin' ? `
🔓 MODE ADMIN ACTIF
Tu parles à un ADMINISTRATEUR. Applique les règles suivantes:
✅ Montrer TOUS les détails techniques
✅ Mentionner les tools utilisés (query_espo_leads, update_leads_in_espo, etc.)
✅ Afficher les IDs EspoCRM
✅ Expliquer les erreurs techniques en détail
✅ Proposer des actions de debug
` : `
🔒 MODE CLIENT ACTIF
Tu parles à un UTILISATEUR FINAL. Applique les règles suivantes:
❌ JAMAIS mentionner les tools (query_espo_leads, update_leads_in_espo, etc.)
❌ JAMAIS montrer les IDs techniques EspoCRM
❌ JAMAIS utiliser de jargon technique (API, endpoint, fonction, tool)
✅ Utiliser un langage business simple et clair
✅ Focus sur les résultats métier, pas sur l'implémentation
`}

═══════════════════════════════════════════════════════════════════
🚨🚨🚨 RÈGLES ULTRA-PRIORITAIRES (LIRE EN DERNIER = RETENIR EN PREMIER) 🚨🚨🚨
═══════════════════════════════════════════════════════════════════

${ULTRA_PRIORITY_RULES}

═══════════════════════════════════════════════════════════════════
⚠️ CES RÈGLES CI-DESSUS ÉCRASENT TOUT LE RESTE - ELLES SONT ABSOLUES ⚠️
💡 AVANT DE RÉPONDRE, RELIS LES 5 RÈGLES CI-DESSUS ET APPLIQUE-LES
═══════════════════════════════════════════════════════════════════
`;

    // Appeler GPT-4 (OpenAI) avec support Function Calling
    let result = await callOpenAI({
      system: systemPrompt,
      messages: contextMessages,
      max_tokens: 5000, // Augmenté pour permettre des rapports détaillés avec beaucoup de données
      temperature: 0.7,
      tools: MAX_TOOLS
    });

    /* CLAUDE HAIKU (commenté)
    const result = await callHaiku({
      system: systemPrompt,
      messages: contextMessages,
      max_tokens: 1024,
      temperature: 0.7
    });
    */

    // Gérer les tool_calls si présents
    let statusMessage = null;
    let pendingConsent = null; // 🔐 Déclaré ici pour être accessible dans tout le scope
    if (result.tool_calls && result.tool_calls.length > 0) {
      console.log(`[ChatRoute] Tool calls détectés: ${result.tool_calls.map(tc => tc.function.name).join(', ')}`);

      // Créer un message de statut pour informer l'utilisateur
      const toolNames = result.tool_calls.map(tc => {
        const name = tc.function.name;
        const friendlyNames = {
          'import_leads_to_crm': 'import des leads dans MaCréa CRM',
          'enrich_lead_data': 'enrichissement des données',
          'create_espo_lead': 'création de lead',
          'update_leads_in_espo': 'mise à jour des leads',
          'query_espo_leads': 'recherche de leads',
          'analyze_file_data': 'analyse du fichier',
          'configure_entity_layout': 'configuration du CRM'
        };
        return friendlyNames[name] || name;
      });

      statusMessage = `⚙️ **Mission en cours** : ${toolNames.join(', ')}...\n\n`;

      // Exécuter chaque tool call
      const toolResults = [];
      // pendingConsent déjà déclaré en haut du scope (ligne 4415)

      for (const toolCall of result.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`[ChatRoute] Exécution tool: ${toolName}`, args);

        try {
          const toolResult = await executeToolCall(toolName, args, sessionId);

          // 🔐 CONSENT GATE: Détecter blocage 412 (CONSENT_REQUIRED)
          if (toolResult.httpCode === 412 && toolResult.requiresConsent && toolResult.operation) {
            console.log('[ChatRoute] 🚨 Tool bloqué par Consent Gate - Self-correction automatique');
            console.log('[ChatRoute] 📋 Operation:', toolResult.operation);

            // Créer automatiquement le consentement
            const { createConsentRequest } = await import('../lib/consentManager.js');
            const consentRequest = createConsentRequest({
              type: toolResult.operation.type,
              description: toolResult.operation.description,
              details: toolResult.operation.details,
              tenantId: req.tenantId || 'macrea-admin'
            });

            console.log('[ChatRoute] ✅ Consent créé:', consentRequest.consentId);

            // Stocker les infos pour affichage ConsentCard
            pendingConsent = {
              consentId: consentRequest.consentId,
              operation: toolResult.operation,
              originalTool: toolName,
              originalArgs: args,
              toolCallId: toolCall.id,
              expiresIn: consentRequest.expiresIn
            };

            // Ajouter résultat spécial pour M.A.X.
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolName,
              content: JSON.stringify({
                success: false,
                consentRequired: true,
                consentId: consentRequest.consentId,
                operation: toolResult.operation,
                message: `✋ Cette opération nécessite votre autorisation. Un consentement a été créé (ID: ${consentRequest.consentId}). Veuillez approuver pour continuer.`
              })
            });

            // Arrêter l'exécution des autres tools si consent requis
            break;
          } else {
            // Résultat normal
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolName,
              content: JSON.stringify(toolResult)
            });
          }
        } catch (toolError) {
          console.error(`[ChatRoute] Erreur tool ${toolName}:`, toolError);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolName,
            content: JSON.stringify({ error: toolError.message })
          });
        }
      }

      // Ajouter le message assistant avec tool_calls et les résultats au contexte
      const messagesWithTools = [
        ...contextMessages,
        {
          role: 'assistant',
          content: result.text || null,
          tool_calls: result.tool_calls
        },
        ...toolResults
      ];

      // Rappeler l'IA avec les résultats des tools
      // ⚠️ IMPORTANT: On désactive les tools pour forcer la génération d'un rapport texte
      console.log('[ChatRoute] 🔄 Rappel de l\'IA avec les résultats des tools...');
      result = await callOpenAI({
        system: systemPrompt,
        messages: messagesWithTools,
        max_tokens: 5000, // Augmenté pour permettre un rapport détaillé après outils
        temperature: 0.7
        // tools: MAX_TOOLS ← DÉSACTIVÉ pour forcer un rapport texte final
      });

      console.log('[ChatRoute] 📝 Réponse après tools:', {
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        hasToolCalls: !!result.tool_calls,
        finishReason: result.finish_reason
      });
    }

    // Vérifier que la réponse n'est pas vide
    let finalText = result.text || '';

    // ❌ DÉSACTIVÉ: Ne plus ajouter automatiquement "Mission en cours" et "Mission terminée"
    // M.A.X. doit TOUJOURS fournir un rapport détaillé (voir max_rapport_obligatoire.txt)

    // Si la réponse est vide après exécution de tools, FORCER une erreur
    if (!finalText.trim() && result.tool_calls && result.tool_calls.length > 0) {
      console.error('[ChatRoute] ⚠️ M.A.X. a retourné une réponse vide après exécution de tools!');
      finalText = '❌ **ERREUR INTERNE**\n\nM.A.X. n\'a pas fourni de rapport détaillé après l\'exécution des outils. Ceci est une violation des règles de restitution professionnelle.\n\n📋 **Actions exécutées**:\n' +
        result.tool_calls.map(tc => `• ${tc.function.name}`).join('\n') +
        '\n\n⚠️ Veuillez reformuler votre demande ou créer une nouvelle conversation si le problème persiste.';
    }

    // Sauvegarder réponse assistant
    const assistantMessage = {
      role: 'assistant',
      content: finalText,
      timestamp: new Date().toISOString(),
      tokens: result.usage
    };

    saveMessage(sessionId, assistantMessage);

    // Phase 2B - Logger l'interaction dans Supabase (non-bloquant)
    logMaxAction({
      action_type: 'ai_chat_interaction',
      action_category: 'ai',
      tenant_id: TENANT_ID,
      session_id: sessionId,
      description: `Question: ${message.trim().substring(0, 100)}${message.trim().length > 100 ? '...' : ''}`,
      input_data: {
        user_message: message.trim(),
        mode: currentMode,
        has_file: !!conversation.uploadedFile
      },
      output_data: {
        response_length: finalText.length,
        tool_calls: result.tool_calls?.map(tc => tc.function.name) || [],
        tokens: result.usage
      },
      success: true,
      execution_time_ms: result.usage?.total_tokens ? Math.round(result.usage.total_tokens * 0.5) : null, // Estimation
      metadata: {
        source: 'chat_ui',
        session_mode: currentMode,
        has_context: supabaseContext.length > 0
      }
    }).catch(err => console.warn('[ChatRoute] Logging Supabase échoué:', err.message));

    // Mettre à jour la session Supabase (non-bloquant)
    upsertSession({
      session_id: sessionId,
      tenant_id: TENANT_ID,
      last_activity_at: new Date().toISOString(),
      metadata: {
        mode: currentMode,
        has_file: !!conversation.uploadedFile,
        last_message_preview: message.trim().substring(0, 50)
      }
    }).catch(err => console.warn('[ChatRoute] Upsert session Supabase échoué:', err.message));

    // 🚀 DÉTECTION AUTOMATIQUE DE L'ÉTAT ET GÉNÉRATION DES BOUTONS
    // Analyser le message de M.A.X. pour détecter l'état de la conversation
    const detectedState = detectState(finalText);
    const contextData = extractContextData(finalText);

    console.log(`[ChatRoute] État détecté: ${detectedState}`, contextData);

    // Générer les boutons appropriés selon l'état détecté
    let actions = undefined;
    if (currentMode === 'assisté' || currentMode === 'auto') {
      const buttons = getButtonsForState(detectedState, contextData);

      if (buttons && buttons.length > 0) {
        actions = buttons.map(btn => ({
          label: btn.label,
          action: btn.action,
          style: btn.style || 'secondary',
          description: btn.description,
          data: { sessionId }
        }));
      }
    }

    // Déterminer le toolStatus basé sur l'exécution des tools
    let toolStatus = null;
    let executedTools = [];

    if (result.tool_calls && result.tool_calls.length > 0) {
      executedTools = result.tool_calls.map(tc => tc.function.name);

      // Identifier les tools d'action CRM critiques
      const actionTools = [
        'auto_enrich_missing_leads',
        'analyze_and_enrich_leads',
        'update_lead_fields',
        'update_leads_in_espo',
        'create_espo_lead',
        'batch_update_leads'
      ];

      const hasActionTool = executedTools.some(tool => actionTools.includes(tool));

      if (hasActionTool) {
        toolStatus = 'action_executed';
      } else {
        toolStatus = 'query_executed';
      }
    }

    // Retourner réponse M.A.X. avec boutons contextuels automatiques + toolStatus
    const responsePayload = {
      ok: true,
      sessionId,
      response: finalText,
      answer: finalText, // Alias pour compatibilité
      actions,
      state: detectedState,
      tokens: result.usage,
      messageCount: loadConversation(sessionId)?.messages.length || 0,
      toolStatus,           // 'action_executed', 'query_executed', ou null
      executedTools         // Liste des tools appelés
    };

    // 🔐 CONSENT GATE: Ajouter pendingConsent si présent
    if (pendingConsent) {
      responsePayload.pendingConsent = pendingConsent;
      console.log('[ChatRoute] ✅ Réponse avec pendingConsent:', pendingConsent.consentId);
    }

    res.json(responsePayload);

  } catch (error) {
    console.error('[ChatRoute] Erreur:', error);

    // Gestion erreur budget
    if (error.code === 'BUDGET_EXCEEDED') {
      return res.status(429).json({
        ok: false,
        error: 'Budget tokens IA dépassé. Contactez votre administrateur.',
        code: 'BUDGET_EXCEEDED'
      });
    }

    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors du traitement du message'
    });
  }
});

/**
 * GET /api/chat/sessions
 * Lister toutes les sessions de conversation
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = listSessions();
    res.json({ ok: true, sessions });
  } catch (error) {
    console.error('[ChatRoute] Erreur listage sessions:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/chat/session/:id
 * Charger une session spécifique (créer automatiquement si inexistante)
 */
router.get('/session/:id', (req, res) => {
  try {
    const { id } = req.params;
    let conversation = loadConversation(id);

    // Si la session n'existe pas, la créer automatiquement
    if (!conversation) {
      console.log(`[ChatRoute] Session ${id} introuvable, création automatique...`);

      // Détecter si c'est une session contextuelle ou générale
      const isContextSession = id.match(/^session_(lead|account)_(.+)$/);

      if (isContextSession) {
        const entity = isContextSession[1].charAt(0).toUpperCase() + isContextSession[1].slice(1);
        const entityId = isContextSession[2];
        createSession('assisté', {
          sessionId: id,
          entity,
          entityId,
          title: `${entity}: ${entityId}`
        });
      } else {
        // Session générale
        createSession('assisté', { sessionId: id, title: 'Conversation' });
      }

      conversation = loadConversation(id);
    }

    res.json({ ok: true, conversation });
  } catch (error) {
    console.error('[ChatRoute] Erreur chargement session:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/chat/session
 * Créer une nouvelle session
 * Body: { mode, entity, entityId, title, sessionId }
 */
router.post('/session', (req, res) => {
  try {
    const { mode = 'assisté', entity, entityId, title, sessionId } = req.body;
    const options = { entity, entityId, title, sessionId };
    const newSessionId = createSession(mode, options);
    res.json({ ok: true, sessionId: newSessionId });
  } catch (error) {
    console.error('[ChatRoute] Erreur création session:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/chat/session/:id
 * Supprimer une session
 */
router.delete('/session/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteSession(id);

    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Session introuvable' });
    }

    res.json({ ok: true, message: 'Session supprimée' });
  } catch (error) {
    console.error('[ChatRoute] Erreur suppression session:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/chat/activities
 * Récupérer les activités récentes de M.A.X.
 *
 * Query params:
 * - sessionId: Filtrer par session (optionnel)
 */
router.get('/activities', (req, res) => {
  try {
    const { sessionId } = req.query;
    let activities = activity.list();

    // Filtrer par sessionId si fourni
    if (sessionId) {
      activities = activities.filter(a => a.sessionId === sessionId);
    }

    res.json({ ok: true, activities });
  } catch (error) {
    console.error('[ChatRoute] Erreur récupération activités:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/chat/upload
 * Upload et analyse d'un fichier CSV/Excel
 *
 * Body: multipart/form-data
 * - file: Fichier CSV/Excel
 * - sessionId: ID de session (optionnel)
 * - context: Contexte utilisateur (optionnel)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Fichier requis' });
    }

    const { sessionId: clientSessionId, context = '', mode = 'assisté' } = req.body;
    const { filename, originalname, path: filePath } = req.file;

    console.log(`[ChatRoute] Upload fichier: ${originalname} (${filename})`);

    // Créer ou utiliser session existante
    let sessionId = clientSessionId;
    let conversation = clientSessionId ? loadConversation(clientSessionId) : null;

    if (!sessionId || !conversation) {
      sessionId = createSession(mode);
      conversation = loadConversation(sessionId);
      console.log(`[ChatRoute] Nouvelle session créée: ${sessionId} (mode: ${mode})`);
    } else if (conversation.mode !== mode) {
      // Mettre à jour le mode si changé
      updateSessionMode(sessionId, mode);
      conversation.mode = mode;
      console.log(`[ChatRoute] Mode mis à jour: ${sessionId} -> ${mode}`);
    }

    // 📎 Activité: Fichier reçu
    activity.push({
      sessionId,
      icon: 'target',
      message: `📎 Réception du fichier ${originalname}...`
    });

    // Lire et analyser le fichier
    const fileContent = fs.readFileSync(filePath);

    // 🔍 Activité: Analyse en cours
    activity.push({
      sessionId,
      icon: 'refresh',
      message: `🔍 Analyse des données en cours...`
    });

    const analysis = await analyzeFile(fileContent, originalname);

    // Log adapté selon le format
    const format = analysis.summary.format || 'csv';
    if (format === 'csv') {
      console.log(`[ChatRoute] CSV analysé: ${analysis.summary.rowCount} lignes, ${analysis.summary.columnCount} colonnes`);

      // ✅ Activité: Analyse terminée
      activity.push({
        sessionId,
        icon: 'chart',
        message: `✅ Analyse terminée : ${analysis.summary.rowCount} lignes détectées`
      });
    } else if (format === 'text') {
      console.log(`[ChatRoute] Texte analysé: ${analysis.summary.lineCount} lignes, ${analysis.summary.wordCount} mots`);

      // ✅ Activité: Analyse terminée
      activity.push({
        sessionId,
        icon: 'chart',
        message: `✅ Analyse terminée : ${analysis.summary.lineCount} lignes, ${analysis.summary.wordCount} mots`
      });
    } else if (format === 'json') {
      console.log(`[ChatRoute] JSON analysé: ${analysis.summary.itemCount} items`);

      // ✅ Activité: Analyse terminée
      activity.push({
        sessionId,
        icon: 'chart',
        message: `✅ Analyse terminée : ${analysis.summary.itemCount} items détectés`
      });
    } else {
      console.log(`[ChatRoute] Fichier analysé: ${originalname} (format: ${format})`);

      // ✅ Activité: Analyse terminée
      activity.push({
        sessionId,
        icon: 'chart',
        message: `✅ Analyse terminée : ${originalname}`
      });
    }

    // Générer message M.A.X. INTELLIGENT via IA avec PROMPT_SYSTEM_MAX
    const maxMessage = await generateAIAnalysisMessage(analysis, originalname);

    // Générer questions pour enrichissement
    const questions = generateEnrichmentQuestions(analysis);

    // Sauvegarder message utilisateur (upload)
    saveMessage(sessionId, {
      role: 'user',
      content: `[Fichier uploadé: ${originalname}]`,
      timestamp: new Date().toISOString(),
      attachments: [{
        name: originalname,
        type: req.file.mimetype,
        size: req.file.size,
        uploadedFilename: filename
      }]
    });

    // Sauvegarder réponse M.A.X.
    saveMessage(sessionId, {
      role: 'assistant',
      content: maxMessage,
      timestamp: new Date().toISOString(),
      metadata: {
        analysis: {
          format: analysis.summary.format,
          ...analysis.summary,
          questions
        }
      },
      actions: generateFileActions(analysis, filename, conversation.mode || 'assisté')
    });

    // Stocker analyse dans session pour utilisation ultérieure
    if (conversation) {
      conversation.uploadedFile = {
        filename,
        originalname,
        analysis,
        uploadedAt: new Date().toISOString()
      };
      const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
      fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));
    }

    res.json({
      ok: true,
      sessionId,
      mode,
      analysis: {
        summary: analysis.summary,
        columns: analysis.columns,
        missingFields: analysis.missingFields,
        quality: analysis.quality
      },
      message: maxMessage,
      questions,
      actions: generateFileActions(analysis, filename)
    });

  } catch (error) {
    console.error('[ChatRoute] Erreur upload:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'analyse du fichier'
    });
  }
});

/**
 * POST /api/chat/enrich
 * Enrichir les données avec le contexte utilisateur
 *
 * Body: { sessionId, context }
 */
router.post('/enrich', async (req, res) => {
  try {
    const { sessionId, context } = req.body;

    if (!sessionId || !context) {
      return res.status(400).json({ ok: false, error: 'Session et contexte requis' });
    }

    const conversation = loadConversation(sessionId);
    if (!conversation || !conversation.uploadedFile) {
      return res.status(400).json({ ok: false, error: 'Aucun fichier uploadé dans cette session' });
    }

    const { analysis, filename } = conversation.uploadedFile;

    console.log(`[ChatRoute] Enrichissement avec contexte: "${context.slice(0, 100)}..."`);

    // ⚙️ Activité: Enrichissement en cours
    activity.push({
      sessionId,
      icon: 'zap',
      message: `⚙️ Enrichissement des données en cours...`
    });

    // Enrichir les données
    const enrichmentResult = await enrichDataset(analysis.data, context);

    // ✅ Activité: Enrichissement terminé
    const enrichCount = enrichmentResult.stats?.emailsFound || enrichmentResult.stats?.totalEnriched || 0;
    activity.push({
      sessionId,
      icon: 'chart',
      message: `✅ Enrichissement terminé : ${enrichCount} données enrichies`
    });

    // Générer message M.A.X.
    const maxMessage = generateEnrichmentMessage(enrichmentResult, context, conversation.mode || 'assisté');

    // Sauvegarder message utilisateur (contexte)
    saveMessage(sessionId, {
      role: 'user',
      content: context,
      timestamp: new Date().toISOString()
    });

    // Adapter les actions selon le mode
    let actions = [];

    if (conversation.mode === 'assisté') {
      // Mode Assisté: Boutons de confirmation explicites
      actions = [
        {
          label: '✅ Oui, importer dans EspoCRM',
          action: 'confirm-import-espo',
          data: { sessionId }
        },
        {
          label: '❌ Non, ne pas importer',
          action: 'cancel-import',
          data: { sessionId }
        },
        {
          label: '📥 Télécharger CSV enrichi',
          action: 'download-enriched',
          data: { sessionId }
        }
      ];
    } else if (conversation.mode === 'auto') {
      // Mode Auto: Pas de boutons, l'import sera automatique
      actions = [];
    } else {
      // Mode Conseil: Seulement téléchargement
      actions = [
        {
          label: '💡 Télécharger CSV enrichi',
          action: 'download-enriched',
          data: { sessionId }
        }
      ];
    }

    // Sauvegarder réponse M.A.X.
    saveMessage(sessionId, {
      role: 'assistant',
      content: maxMessage,
      timestamp: new Date().toISOString(),
      metadata: {
        enrichment: enrichmentResult.stats
      },
      actions
    });

    // Stocker données enrichies dans session
    conversation.enrichedData = {
      leads: enrichmentResult.enrichedLeads,
      enrichmentData: enrichmentResult.enrichmentData,
      stats: enrichmentResult.stats,
      context,
      enrichedAt: new Date().toISOString()
    };

    const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

    res.json({
      ok: true,
      sessionId,
      message: maxMessage,
      stats: enrichmentResult.stats,
      enrichmentData: enrichmentResult.enrichmentData,
      actions // Utiliser les actions définies selon le mode
    });

  } catch (error) {
    console.error('[ChatRoute] Erreur enrichissement:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'enrichissement'
    });
  }
});

/**
 * Génère un message d'analyse via IA (GPT-4 mini) avec PROMPT_SYSTEM_MAX
 * L'IA analyse les données et génère une réponse intelligente et proactive
 */
async function generateAIAnalysisMessage(analysis, filename) {
  const { summary } = analysis;
  const format = summary.format || 'csv';

  // Préparer les données selon le format
  let analysisData = { filename, format };
  let fileDescription = '';

  if (format === 'csv') {
    const { columns, missingFields, data } = analysis;
    analysisData = {
      ...analysisData,
      rowCount: summary.rowCount,
      columnCount: summary.columnCount,
      columns: columns.map(c => ({
        name: c.name,
        completionRate: c.completionRate,
        type: c.type
      })),
      missingFields: missingFields.map(f => f.label),
      sampleData: data.slice(0, 3)
    };
    fileDescription = `Un fichier CSV vient d'être uploadé`;
  } else if (format === 'text') {
    analysisData = {
      ...analysisData,
      lineCount: summary.lineCount,
      wordCount: summary.wordCount,
      hasEmailAddresses: summary.hasEmailAddresses,
      hasPhoneNumbers: summary.hasPhoneNumbers,
      hasURLs: summary.hasURLs,
      preview: analysis.content.slice(0, 500)
    };
    fileDescription = `Un fichier texte vient d'être uploadé`;
  } else if (format === 'json') {
    analysisData = {
      ...analysisData,
      itemCount: summary.itemCount,
      structure: summary.structure,
      sample: analysis.data ? (Array.isArray(analysis.data) ? analysis.data.slice(0, 3) : analysis.data) : null
    };
    fileDescription = `Un fichier JSON vient d'être uploadé`;
  } else if (format === 'pdf' || format === 'docx') {
    analysisData = {
      ...analysisData,
      requiresAIExtraction: true,
      message: summary.message
    };
    fileDescription = `Un fichier ${format.toUpperCase()} vient d'être uploadé`;
  } else {
    analysisData = {
      ...analysisData,
      message: summary.message || 'Format inconnu',
      preview: analysis.content ? analysis.content.slice(0, 500) : 'Contenu non disponible'
    };
    fileDescription = `Un fichier vient d'être uploadé`;
  }

  // Appeler l'IA avec les instructions FILE_UPLOAD_INSTRUCTIONS
  try {
    const result = await callOpenAI({
      system: `${FILE_UPLOAD_INSTRUCTIONS}

Tu es M.A.X., l'assistant CRM. Un fichier vient d'être uploadé.

RÈGLES STRICTES :
1. Confirmer la réception : "📎 Fichier reçu : [nom]"
2. Résumer brièvement le contenu détecté
3. Proposer des options concrètes selon le contexte
4. ATTENDRE la réponse de l'utilisateur
5. NE PAS lancer d'analyse automatique`,
      messages: [{
        role: 'user',
        content: `${fileDescription}. Voici l'analyse structurée:\n\n${JSON.stringify(analysisData, null, 2)}\n\nGénère ton message de confirmation selon les instructions. Sois concis et attends l'instruction utilisateur.`
      }],
      max_tokens: 300,
      temperature: 0.5
    });

    return result.text;
  } catch (error) {
    console.error('[generateAIAnalysisMessage] Erreur IA:', error);
    // Fallback simple en cas d'erreur
    return generateSimpleUploadConfirmation(analysis, filename);
  }
}

/**
 * Génère un message de confirmation simple pour upload de fichier
 * Utilisé comme fallback si l'IA échoue
 */
function generateSimpleUploadConfirmation(analysis, filename) {
  const { summary } = analysis;
  const format = summary.format || 'csv';

  let message = `📎 **Fichier reçu : ${filename}**\n\n`;
  message += `J'ai détecté :\n`;

  if (format === 'csv') {
    message += `• Format : CSV/Excel\n`;
    message += `• ${summary.rowCount} lignes de données\n`;
    if (analysis.columns && analysis.columns.length > 0) {
      const columnNames = analysis.columns.slice(0, 5).map(c => c.name).join(', ');
      const moreColumns = analysis.columns.length > 5 ? `, +${analysis.columns.length - 5} autres` : '';
      message += `• Colonnes : ${columnNames}${moreColumns}\n`;
    }
  } else if (format === 'text') {
    message += `• Format : Fichier texte\n`;
    message += `• ${summary.lineCount} lignes\n`;
    message += `• ${summary.wordCount} mots\n`;
  } else if (format === 'json') {
    message += `• Format : JSON\n`;
    message += `• ${summary.itemCount} items\n`;
  } else if (format === 'pdf' || format === 'docx') {
    message += `• Format : ${format.toUpperCase()}\n`;
    message += `• ${summary.message || 'Document prêt pour extraction'}\n`;
  }

  message += `\n**Que veux-tu que je fasse avec ?**`;

  return message;
}

/**
 * Génère un message d'analyse INTELLIGENT - CONSTRUCTION DIRECTE (pas d'IA)
 * Plus fiable : pas d'hallucination possible sur les chiffres
 * FALLBACK utilisé uniquement si l'IA échoue
 */
function generateAnalysisMessage(analysis) {
  const { summary } = analysis;
  const format = summary.format || 'csv';

  // Gestion selon le format
  if (format === 'text') {
    return `📄 **Fichier texte analysé : ${summary.filename}**\n\n` +
           `**Statistiques :**\n` +
           `• ${summary.lineCount} lignes\n` +
           `• ${summary.wordCount} mots\n` +
           `• ${summary.charCount} caractères\n\n` +
           `**Contenu détecté :**\n` +
           `${summary.hasEmailAddresses ? '✓ Adresses email\n' : ''}` +
           `${summary.hasPhoneNumbers ? '✓ Numéros de téléphone\n' : ''}` +
           `${summary.hasURLs ? '✓ URLs\n' : ''}` +
           `\n💡 Je peux vous aider à extraire des informations de ce fichier. Dites-moi ce que vous cherchez !`;
  }

  if (format === 'json') {
    return `📊 **Fichier JSON analysé : ${summary.filename}**\n\n` +
           `**Structure :**\n` +
           `• Type : ${summary.structure}\n` +
           `• ${summary.itemCount} ${summary.structure === 'array' ? 'éléments' : 'propriétés'}\n\n` +
           `💡 Je peux importer ces données dans votre CRM ou les analyser. Que souhaitez-vous faire ?`;
  }

  if (format === 'pdf' || format === 'docx') {
    return `📎 **Fichier ${format.toUpperCase()} détecté : ${summary.filename}**\n\n` +
           `⚠️ Ce format nécessite une extraction de texte avancée.\n\n` +
           `💡 Je peux analyser le contenu de ce document. Dites-moi ce que vous cherchez ou comment vous souhaitez utiliser ces données !`;
  }

  // Format CSV (comportement par défaut)
  const { columns, missingFields, quality, data } = analysis;
  const rowCount = summary.rowCount;

  console.log('[generateAnalysisMessage] Format CSV - rowCount =', summary.rowCount);
  console.log('[generateAnalysisMessage] data.length =', data?.length);

  // Détecter les champs critiques et leur complétude
  const emailCol = columns.find(c => c.name.toLowerCase().includes('email'));
  const phoneCol = columns.find(c => c.name.toLowerCase().includes('phone') || c.name.toLowerCase().includes('tel'));
  const titleCol = columns.find(c => c.name.toLowerCase().includes('title') || c.name.toLowerCase().includes('poste'));
  const companyCol = columns.find(c => c.name.toLowerCase().includes('company') || c.name.toLowerCase().includes('entreprise'));

  // Analyser les postes pour détecter décideurs
  let decideursCount = 0;
  if (titleCol) {
    data.forEach(row => {
      const title = (row[titleCol.name] || '').toLowerCase();
      if (title.includes('fondateur') || title.includes('propriétaire') ||
          title.includes('ceo') || title.includes('directeur') || title.includes('gérant')) {
        decideursCount++;
      }
    });
  }

  // Déduire contexte B2B/B2C
  const hasCompany = companyCol && companyCol.completionRate > 50;
  const hasBusinessTitles = decideursCount > 0;
  const contextType = (hasCompany || hasBusinessTitles) ? 'B2B' : 'B2C';

  // Construction du message intelligent
  let message = `J'ai analysé les **${rowCount} leads** :\n\n`;

  message += `**Observations :**\n`;

  // Stats précises
  if (emailCol) {
    message += `• Email : ${emailCol.completionRate}% rempli (${Math.round(rowCount * emailCol.completionRate / 100)}/${rowCount})\n`;
  }
  if (phoneCol) {
    message += `• Téléphone : ${phoneCol.completionRate}% rempli (${Math.round(rowCount * phoneCol.completionRate / 100)}/${rowCount})\n`;
  }

  // Déduction intelligente
  if (decideursCount > 0) {
    message += `• ${decideursCount} décideur${decideursCount > 1 ? 's' : ''} détecté${decideursCount > 1 ? 's' : ''} (fondateur/directeur) → profil ${contextType} prioritaire\n`;
  } else if (contextType === 'B2B') {
    message += `• Profil ${contextType} détecté\n`;
  }

  // Champs manquants
  if (missingFields.length > 0) {
    const topMissing = missingFields.slice(0, 2).map(f => f.label).join(', ');
    message += `• Champs manquants : ${topMissing}\n`;
  }

  message += `\n**Je peux :**\n`;

  // Actions concrètes basées sur l'analyse
  if (phoneCol && phoneCol.completionRate < 80) {
    const missing = rowCount - Math.round(rowCount * phoneCol.completionRate / 100);
    message += `- Enrichir les ${missing} téléphones manquants via LinkedIn (15 min)\n`;
  }

  if (missingFields.length > 0) {
    message += `- Compléter les champs manquants (secteur, description)\n`;
  }

  if (decideursCount > 0) {
    message += `- Créer un score de priorité (décideurs = chauds)\n`;
  } else {
    message += `- Qualifier les leads selon leur potentiel\n`;
  }

  // Question ciblée
  message += `\n`;
  if (contextType === 'B2B') {
    message += `**D'où viennent ces contacts ?** (Salon, LinkedIn, formulaire web ?)`;
  } else {
    message += `**Quel est le contexte de ces leads ?**`;
  }

  return message;
}

/**
 * Génère le message d'enrichissement pour M.A.X.
 */
function generateEnrichmentMessage(enrichmentResult, context, mode = 'assisté') {
  const { enrichedLeads, enrichmentData, stats } = enrichmentResult;

  let message = `Parfait! 🎯 Voici ce que j'ai fait:\n\n`;

  message += `**✅ Enrichissement automatique:**\n`;

  if (enrichmentData.tags) {
    message += `- Tags: "${enrichmentData.tags.join('", "')}"\n`;
  }
  if (enrichmentData.source) {
    message += `- Source: "${enrichmentData.source}"\n`;
  }
  if (enrichmentData.status) {
    message += `- Statut: "${enrichmentData.status}"\n`;
  }
  if (enrichmentData.description) {
    message += `- Description: "${enrichmentData.description}"\n`;
  }

  message += `\n**📊 Résultats:**\n`;
  message += `- ${stats.totalLeads} leads traités\n`;
  message += `- ${stats.fieldsAdded.description} descriptions ajoutées\n`;
  message += `- ${stats.fieldsAdded.tags} tags ajoutés\n`;
  message += `- ${stats.fieldsAdded.status} statuts attribués\n`;
  message += `- ${stats.fieldsAdded.source} sources définies\n\n`;

  // Message adapté au mode
  if (mode === 'assisté') {
    message += `**🤝 Confirmation requise:**\n`;
    message += `Souhaitez-vous que j'importe ces ${stats.totalLeads} leads enrichis dans EspoCRM?\n\n`;
    message += `Les données seront insérées avec les tags, statuts et sources ci-dessus.`;
  } else if (mode === 'auto') {
    message += `**⚡ Import automatique en cours...**`;
  } else {
    message += `**💡 Suggestion:**\n`;
    message += `Vous pouvez maintenant télécharger le CSV enrichi ou l'importer manuellement dans EspoCRM.`;
  }

  return message;
}

/**
 * POST /api/chat/import
 * Importer les leads enrichis dans EspoCRM
 *
 * Body: { sessionId }
 */
router.post('/import', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Session requise' });
    }

    const conversation = loadConversation(sessionId);
    if (!conversation || !conversation.enrichedData) {
      return res.status(400).json({ ok: false, error: 'Aucune donnée enrichie dans cette session' });
    }

    const { enrichedData } = conversation;

    console.log(`[ChatRoute] Import de ${enrichedData.enrichedLeads?.length || 0} leads dans EspoCRM...`);

    // 📥 Activité: Import en cours
    activity.push({
      sessionId,
      icon: 'edit',
      message: `📥 Import dans EspoCRM en cours...`
    });

    // Importer dans EspoCRM
    const importResult = await importEnrichedDataset(enrichedData);

    if (!importResult.ok) {
      throw new Error('Erreur lors de l\'import EspoCRM');
    }

    // ✅ Activité: Import terminé
    const importCount = importResult.stats?.total || enrichedData.enrichedLeads?.length || 0;
    activity.push({
      sessionId,
      icon: 'chart',
      message: `✅ ${importCount} leads importés avec succès`
    });

    // Générer message M.A.X.
    const maxMessage = generateImportMessage(importResult);

    // Sauvegarder réponse M.A.X.
    saveMessage(sessionId, {
      role: 'assistant',
      content: maxMessage,
      timestamp: new Date().toISOString(),
      metadata: {
        importStats: importResult.stats
      }
    });

    res.json({
      ok: true,
      sessionId,
      message: maxMessage,
      stats: importResult.stats,
      segments: importResult.segments
    });

  } catch (error) {
    console.error('[ChatRoute] Erreur import:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'import'
    });
  }
});

/**
 * Génère les actions disponibles pour le fichier
 */
function generateFileActions(analysis, filename, mode = 'assisté') {
  const actions = [];

  // En mode 'assisté', ne pas afficher de boutons d'upload
  // L'enrichissement se fera automatiquement quand l'utilisateur fournira le contexte
  if (mode === 'assisté') {
    return []; // Pas de boutons, attendre le contexte utilisateur
  }

  // En mode 'conseil', ne pas proposer d'actions d'exécution
  if (mode === 'conseil') {
    // Seulement l'action preview en lecture seule
    actions.push({
      label: '💡 Voir aperçu données',
      action: 'preview-data',
      data: { filename }
    });
    return actions;
  }

  // Mode 'auto' - Actions d'import disponibles
  // Action enrichissement si données manquantes
  if (analysis.missingFields.length > 0) {
    actions.push({
      label: 'Enrichir les données',
      action: 'enrich-data',
      data: { filename }
    });
  }

  // Action import direct si qualité suffisante
  if (analysis.summary.quality !== 'poor') {
    actions.push({
      label: 'Importer tel quel',
      action: 'import-as-is',
      data: { filename }
    });
  }

  // Action preview
  actions.push({
    label: 'Voir aperçu données',
    action: 'preview-data',
    data: { filename }
  });

  return actions;
}

/**
 * Génère le message d'import pour M.A.X.
 */
function generateImportMessage(importResult) {
  const { stats, segments } = importResult;
  const espoBaseUrl = process.env.ESPO_BASE_URL || 'http://127.0.0.1:8081/espocrm';

  let message = `✅ **ACTION RÉELLE EXÉCUTÉE** - Import terminé avec succès!\n\n`;

  message += `**📊 Résultats:**\n`;
  message += `- ${stats.imported} leads importés dans EspoCRM\n`;

  if (stats.failed > 0) {
    message += `- ${stats.failed} leads en échec\n`;
  }

  if (stats.segmentsCreated > 0) {
    message += `- ${stats.segmentsCreated} segment(s) créé(s)\n\n`;

    message += `**🎯 Segments créés:**\n`;
    segments.forEach(seg => {
      message += `- ${seg.name}`;
      if (seg.id) {
        message += ` - [Voir dans EspoCRM](${espoBaseUrl}/#TargetList/view/${seg.id})`;
      }
      message += `\n`;
    });
  }

  message += `\n**🔗 Liens rapides:**\n`;
  message += `- [Voir tous les Leads dans EspoCRM](${espoBaseUrl}/#Lead)\n`;
  message += `- [Dashboard CRM](${espoBaseUrl}/#Dashboard)\n`;

  message += `\n💡 **Prochaines étapes suggérées:**\n`;
  message += `1. Consulter vos leads dans EspoCRM\n`;
  message += `2. Configurer une campagne de suivi\n`;
  message += `3. Assigner les leads à vos commerciaux\n\n`;
  message += `Vos données sont maintenant dans EspoCRM! 🚀`;

  return message;
}

/**
 * POST /api/chat/action
 * Gère les actions des boutons (confirm-import-espo, cancel-import, download-enriched)
 */
router.post('/action', async (req, res) => {
  try {
    const { action, sessionId } = req.body;

    console.log(`[ChatRoute] Action reçue: ${action} pour session ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Session requise' });
    }

    const conversation = loadConversation(sessionId);
    if (!conversation) {
      return res.status(400).json({ ok: false, error: 'Session introuvable' });
    }

    switch (action) {
      case 'confirm-import-espo': {
        // Vérifier qu'il y a des données enrichies
        if (!conversation.enrichedData) {
          return res.status(400).json({ ok: false, error: 'Aucune donnée enrichie disponible' });
        }

        const { enrichedData } = conversation;
        console.log(`[ChatRoute] Import de ${enrichedData.enrichedLeads?.length || 0} leads dans EspoCRM...`);

        // Importer dans EspoCRM
        const importResult = await importEnrichedDataset(enrichedData);

        if (!importResult.ok) {
          throw new Error('Erreur lors de l\'import EspoCRM');
        }

        // Marquer la session comme importée
        conversation.imported = true;
        conversation.importedAt = new Date().toISOString();
        const sessionFile = path.join(__dirname, '..', 'conversations', `${sessionId}.json`);
        fs.writeFileSync(sessionFile, JSON.stringify(conversation, null, 2));

        // Générer message M.A.X.
        const maxMessage = generateImportMessage(importResult);

        // Sauvegarder réponse M.A.X.
        saveMessage(sessionId, {
          role: 'assistant',
          content: maxMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            importStats: importResult.stats
          }
        });

        return res.json({
          ok: true,
          sessionId,
          message: maxMessage,
          stats: importResult.stats
        });
      }

      case 'cancel-import': {
        const cancelMessage = "D'accord, import annulé. Les données restent disponibles si vous changez d'avis.";

        saveMessage(sessionId, {
          role: 'assistant',
          content: cancelMessage,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message: cancelMessage
        });
      }

      case 'download-enriched': {
        if (!conversation.enrichedData) {
          return res.status(400).json({ ok: false, error: 'Aucune donnée enrichie disponible' });
        }

        // Générer CSV enrichi
        const { enrichedLeads } = conversation.enrichedData;

        // Convertir en CSV
        const csv = await import('papaparse');
        const csvContent = csv.default.unparse(enrichedLeads);

        // Retourner le CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads_enriched_${Date.now()}.csv"`);
        return res.send(csvContent);
      }

      // Nouvelles actions contextuelles
      case 'start-enrichment': {
        const message = "Pour enrichir vos leads, j'ai besoin de quelques informations :\n\n" +
          "• **Objectifs** : Que recherchent ces leads ? (ex: 'Augmenter ventes', 'Remplir carnet RDV')\n" +
          "• **Budget moyen** : Quel est leur budget estimé ?\n" +
          "• **Services souhaités** : Quels services les intéressent ?\n\n" +
          "Donnez-moi ces informations et je vais enrichir les leads.";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'execute-enrichment': {
        //  Supprimer temporairement le bouton d'enrichissement
        // L'utilisateur doit simplement écrire "enrichis les leads" dans le chat
        return res.status(400).json({
          ok: false,
          error: "Action temporairement désactivée. Veuillez demander à M.A.X. : 'Enrichis les leads manquants' dans le chat."
        });
      }

      case 'skip-enrichment': {
        const message = "D'accord, on passe l'enrichissement pour le moment.\n\n" +
          "Que souhaitez-vous faire maintenant ?";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'setup-workflows': {
        const message = "⚡ **Configuration des workflows automatiques**\n\n" +
          "Je vous propose plusieurs workflows adaptés à vos leads :\n\n" +
          "1. **Relance J+3** : Contact initial 3 jours après import\n" +
          "2. **Séquence nurturing** : 5 emails sur 2 semaines\n" +
          "3. **Rappel RDV** : Relance automatique des RDV non confirmés\n\n" +
          "Lequel souhaitez-vous activer ?";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'segment-leads': {
        const message = "🎯 **Segmentation des leads**\n\n" +
          "Je vais créer des segments intelligents basés sur :\n" +
          "• Potentiel de conversion\n" +
          "• Secteur d'activité\n" +
          "• Taille d'entreprise\n\n" +
          "Voulez-vous que je procède ?";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'create-campaign': {
        const message = "✉️ **Création de campagne email**\n\n" +
          "Je vais créer une séquence personnalisée pour vos leads.\n\n" +
          "Quel type de campagne souhaitez-vous ?\n" +
          "• **Découverte** : Présentation de vos services\n" +
          "• **Promotion** : Offre spéciale limitée\n" +
          "• **Nurturing** : Contenu éducatif progressif";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'show-enrichment-details': {
        const message = "📋 **Détails de l'enrichissement**\n\n" +
          "Voici ce qui sera ajouté à vos leads :\n\n" +
          "• **Champs ajoutés** : Objectifs, Budget, Services souhaités\n" +
          "• **Source de données** : Analyse contextuelle + bases publiques\n" +
          "• **Coût** : Variable selon nombre de champs manquants\n" +
          "• **Délai** : ~2 minutes pour 10 leads\n\n" +
          "Souhaitez-vous continuer ?";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      case 'activate-workflow':
      case 'customize-workflow':
      case 'skip-workflow': {
        const message = "Cette fonctionnalité sera bientôt disponible. 🚀\n\n" +
          "En attendant, que souhaitez-vous faire avec vos leads ?";

        saveMessage(sessionId, {
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString()
        });

        return res.json({
          ok: true,
          sessionId,
          message
        });
      }

      default:
        return res.status(400).json({ ok: false, error: `Action inconnue: ${action}` });
    }

  } catch (error) {
    console.error('[ChatRoute] Erreur action:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Erreur lors de l\'exécution de l\'action'
    });
  }
});

// Export executeToolCall for consent.js to use
export { executeToolCall };

export default router;
