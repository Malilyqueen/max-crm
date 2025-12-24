/**
 * Action: Créer un article de base de connaissance dans EspoCRM
 *
 * Params:
 * - tenantId: string
 * - name: string (obligatoire - titre de l'article)
 * - body: string (obligatoire - contenu)
 * - status: string (défaut: 'Draft') - Draft|In Review|Published|Archived
 * - language: string (défaut: 'fr_FR')
 * - categoryId: string (optionnel)
 */

import { espoFetch } from '../lib/espoClient.js';

export async function createKnowledgeArticle(params) {
  const {
    tenantId,
    name,
    body,
    status = 'Draft',
    language = 'fr_FR',
    categoryId
  } = params;

  if (!name || !body) {
    throw new Error('name et body sont obligatoires');
  }

  try {
    const payload = {
      name,
      body,
      status,
      language
    };

    if (categoryId) {
      payload.categoryId = categoryId;
    }

    const article = await espoFetch('/KnowledgeBaseArticle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      success: true,
      provider: 'espocrm',
      entityId: article.id,
      preview: `Article KB "${name}" créé (${status})`,
      metadata: {
        articleId: article.id,
        name,
        status,
        language
      }
    };

  } catch (error) {
    return {
      success: false,
      provider: 'espocrm',
      error: error.message,
      preview: `Échec création article KB: ${error.message}`
    };
  }
}
