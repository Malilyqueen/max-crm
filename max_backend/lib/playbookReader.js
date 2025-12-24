/**
 * playbookReader.js
 * Système de lecture et parsing des playbooks de troubleshooting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLAYBOOKS_DIR = path.join(__dirname, '..', 'playbooks');

/**
 * Mapping des issues vers les fichiers de playbooks
 */
const PLAYBOOK_MAP = {
  field_update_failed: 'LEAD_FIELD_UPDATE_FAILED.md',
  whatsapp_send_failed: 'WHATSAPP_SEND_FAILED.md',
  email_send_failed: 'EMAIL_SEND_FAILED.md',
  lead_import_failed: 'LEAD_IMPORT_FAILED.md',
  crm_sync_failed: 'CRM_SYNC_FAILED.md',
  enrichment_failed: 'ENRICHMENT_FAILED.md',
  workflow_n8n_failed: 'WORKFLOW_N8N_FAILED.md',
  search_no_results: 'SEARCH_NO_RESULTS.md',
  general_error: 'GENERAL_ERROR.md'
};

/**
 * Lit et parse un playbook de troubleshooting
 *
 * @param {string} issue - Type d'issue (ex: 'field_update_failed')
 * @param {object} context - Contexte additionnel pour personnaliser le diagnostic
 * @param {boolean} getUserFacing - Si true, retourne message formaté pour l'utilisateur
 * @returns {object} { ok, playbook, userMessage, diagnosis, solutions }
 */
export async function consultPlaybook(issue, context = {}, getUserFacing = true) {
  try {
    // 1. Vérifier que l'issue est valide
    const filename = PLAYBOOK_MAP[issue];
    if (!filename) {
      return {
        ok: false,
        error: `Issue inconnue: ${issue}`,
        availableIssues: Object.keys(PLAYBOOK_MAP)
      };
    }

    // 2. Lire le fichier playbook
    const filepath = path.join(PLAYBOOKS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Playbook ${filename} non trouvé, création recommandée`);
      return {
        ok: false,
        error: `Playbook ${filename} n'existe pas encore`,
        recommendation: `Créez le fichier ${filepath} en suivant la structure définie dans INDEX.md`
      };
    }

    const content = fs.readFileSync(filepath, 'utf-8');

    // 3. Parser le contenu
    const parsed = parsePlaybook(content, context);

    // 4. Générer le message utilisateur si demandé
    if (getUserFacing) {
      const userMessage = generateUserMessage(issue, context, parsed);
      return {
        ok: true,
        issue,
        playbook: parsed,
        userMessage,
        context
      };
    }

    // 5. Retourner le playbook complet pour usage technique
    return {
      ok: true,
      issue,
      playbook: parsed,
      context
    };

  } catch (error) {
    console.error(`❌ Erreur consultation playbook ${issue}:`, error);
    return {
      ok: false,
      error: error.message,
      fallbackMessage: generateFallbackMessage(issue, context)
    };
  }
}

/**
 * Parse le contenu Markdown d'un playbook
 * Extrait: symptômes, diagnostic, solutions, code, messages types
 */
function parsePlaybook(content, context) {
  const sections = {
    symptoms: extractSection(content, '## Symptômes'),
    diagnosis: extractSection(content, '## Diagnostic Étape par Étape'),
    solutions: extractSolutions(content),
    messages: extractSection(content, '## Messages Types'),
    code: extractCodeBlocks(content),
    prevention: extractSection(content, '## Prévention Future')
  };

  return sections;
}

/**
 * Extrait une section du Markdown
 */
function extractSection(content, sectionHeader) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex(line => line.trim() === sectionHeader);

  if (startIdx === -1) return null;

  // Trouver la prochaine section de niveau 2
  let endIdx = lines.findIndex((line, idx) =>
    idx > startIdx && line.trim().startsWith('## ') && line.trim() !== sectionHeader
  );

  if (endIdx === -1) endIdx = lines.length;

  return lines.slice(startIdx + 1, endIdx).join('\n').trim();
}

/**
 * Extrait les solutions (Options A, B, C)
 */
function extractSolutions(content) {
  const solutions = [];
  const optionRegex = /\*\*Option ([ABC])[^\*]*\*\*:\s*([^\n]+)/g;
  let match;

  while ((match = optionRegex.exec(content)) !== null) {
    solutions.push({
      option: match[1],
      description: match[2].trim()
    });
  }

  return solutions;
}

/**
 * Extrait les blocs de code
 */
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return codeBlocks;
}

/**
 * Génère un message formaté pour l'utilisateur final
 */
function generateUserMessage(issue, context, parsed) {
  const messages = {
    field_update_failed: generateFieldUpdateMessage(context, parsed),
    whatsapp_send_failed: generateWhatsAppMessage(context, parsed),
    // Autres cas...
  };

  return messages[issue] || generateGenericMessage(issue, context, parsed);
}

/**
 * Message spécifique pour échec de mise à jour de champ
 */
function generateFieldUpdateMessage(context, parsed) {
  const { field, expectedValue, actualValue, leadId } = context;

  return `❌ **Je n'ai pas pu mettre à jour le champ "${field}"**

🔍 **Diagnostic**:
- Champ visé: \`${field}\`
- Valeur attendue: "${expectedValue}"
- Valeur actuelle: "${actualValue}"
- Lead ID: ${leadId}

💡 **Ce que je vais essayer**:
${parsed.solutions?.map((s, i) => `${i + 1}. ${s.description}`).join('\n') || '- Vérifier le nom exact du champ dans l\'API\n- Tester avec différentes variations'}

🛠️ **Actions recommandées**:
- Ce champ pourrait être en lecture seule
- Il peut y avoir une validation côté serveur
- Le champ pourrait être lié à un autre module

Je vais maintenant essayer une approche alternative...`;
}

/**
 * Message spécifique pour échec WhatsApp
 */
function generateWhatsAppMessage(context, parsed) {
  const { error, template, leadId } = context;

  // Cas spécifique: n8n non démarré
  if (error && error.includes('ECONNREFUSED')) {
    return `❌ **Impossible d'envoyer le WhatsApp**

🔍 **Diagnostic**: n8n n'est pas démarré (erreur de connexion au port 5678)

💡 **Solution rapide**:
n8n doit tourner pour que les workflows WhatsApp fonctionnent.

🛠️ **Actions possibles**:
1. ✅ Je peux essayer de démarrer n8n automatiquement
2. 📞 Vous pouvez démarrer n8n manuellement: \`npx n8n\`
3. 👨‍💼 Vous pouvez demander à l'admin système

Que souhaitez-vous faire?`;
  }

  // Cas générique
  return `❌ **Échec d'envoi WhatsApp**

🔍 **Diagnostic**:
${template ? `- Template: ${template}` : ''}
${leadId ? `- Lead: ${leadId}` : ''}
${error ? `- Erreur: ${error}` : ''}

💡 **Vérifications en cours**:
${parsed.solutions?.map((s, i) => `${i + 1}. ${s.description}`).join('\n') || '- Vérification de la configuration\n- Validation du template'}

Je vais analyser le problème plus en détail...`;
}

/**
 * Message générique pour issues non mappées
 */
function generateGenericMessage(issue, context, parsed) {
  return `❌ **Un problème est survenu**

🔍 **Type**: ${issue.replace(/_/g, ' ')}

💡 **Analyse en cours**:
Je consulte le guide de dépannage pour trouver la meilleure solution...

${parsed.solutions?.length > 0
  ? `**Options disponibles**:\n${parsed.solutions.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}`
  : 'Je vais essayer plusieurs approches alternatives.'}

Laissez-moi quelques instants pour résoudre ce problème.`;
}

/**
 * Message de secours si le playbook n'existe pas ou erreur de lecture
 */
function generateFallbackMessage(issue, context) {
  return `⚠️ **Situation inattendue détectée**

Je rencontre un problème de type "${issue.replace(/_/g, ' ')}" mais je n'ai pas encore de guide de dépannage pour ce cas précis.

🔍 **Contexte**:
${JSON.stringify(context, null, 2)}

🛠️ **Ce que je vais faire**:
1. Enregistrer ce cas pour améliorer mes guides
2. Essayer les solutions standards
3. Vous tenir informé des résultats

Si le problème persiste, je recommande de contacter le support technique avec ce message.`;
}

/**
 * Liste tous les playbooks disponibles
 */
export function listAvailablePlaybooks() {
  return Object.entries(PLAYBOOK_MAP).map(([issue, filename]) => {
    const filepath = path.join(PLAYBOOKS_DIR, filename);
    const exists = fs.existsSync(filepath);

    return {
      issue,
      filename,
      exists,
      path: exists ? filepath : null
    };
  });
}

/**
 * Vérifie si un playbook existe pour une issue donnée
 */
export function hasPlaybook(issue) {
  const filename = PLAYBOOK_MAP[issue];
  if (!filename) return false;

  const filepath = path.join(PLAYBOOKS_DIR, filename);
  return fs.existsSync(filepath);
}

export default {
  consultPlaybook,
  listAvailablePlaybooks,
  hasPlaybook
};
