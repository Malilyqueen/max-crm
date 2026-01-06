/**
 * Modèle WhatsAppMessage (en mémoire pour MVP Phase 1)
 *
 * Représente un message WhatsApp configurable par l'utilisateur.
 * Structure pensée pour être facilement migrée vers une base de données plus tard.
 *
 * Champs:
 * - id: Identifiant unique
 * - tenantId: ID du tenant (multitenant)
 * - name: Nom du message (ex: "Confirmation RDV Salon")
 * - type: Type d'action (appointment, cart, event, follow_up)
 * - messageText: Texte du message avec variables MAX ({{prenom}}, {{date}}, etc.)
 * - variables: Tableau des variables utilisées
 * - buttons: Tableau des boutons avec action + label
 * - contentSid: ContentSid Twilio (null si pas encore synchronisé)
 * - status: draft, active, archived
 * - createdAt: Date de création
 * - updatedAt: Date de dernière modification
 */

import crypto from 'crypto';

// Stockage en mémoire (sera remplacé par une vraie DB plus tard)
const messages = new Map();

export class WhatsAppMessage {
  constructor(data) {
    this.id = data.id || generateId();
    this.tenantId = data.tenantId;
    this.name = data.name;
    this.type = data.type;
    this.messageText = data.messageText;
    this.variables = data.variables || [];
    this.buttons = data.buttons || [];
    this.contentSid = data.contentSid || null;
    this.status = data.status || 'draft';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * Valide les données du message
   */
  validate() {
    const errors = [];

    if (!this.tenantId) {
      errors.push('tenantId est obligatoire');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('name est obligatoire');
    }

    if (!this.type || !['appointment', 'cart', 'event', 'follow_up'].includes(this.type)) {
      errors.push('type doit être: appointment, cart, event ou follow_up');
    }

    if (!this.messageText || this.messageText.trim() === '') {
      errors.push('messageText est obligatoire');
    }

    // Vérifier que les variables dans messageText sont déclarées
    const variablesInText = extractVariables(this.messageText);
    const undeclaredVars = variablesInText.filter(v => !this.variables.includes(v));
    if (undeclaredVars.length > 0) {
      errors.push(`Variables non déclarées dans messageText: ${undeclaredVars.join(', ')}`);
    }

    // Vérifier la structure des boutons
    if (this.buttons && this.buttons.length > 0) {
      this.buttons.forEach((btn, index) => {
        if (!btn.action || !btn.label) {
          errors.push(`Bouton ${index + 1}: action et label sont obligatoires`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sauvegarde le message (en mémoire)
   */
  save() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
    }

    this.updatedAt = new Date().toISOString();
    messages.set(this.id, this);
    return this;
  }

  /**
   * Supprime le message
   */
  delete() {
    return messages.delete(this.id);
  }

  /**
   * Convertit en objet simple (pour JSON)
   */
  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      type: this.type,
      messageText: this.messageText,
      variables: this.variables,
      buttons: this.buttons,
      contentSid: this.contentSid,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  /**
   * Trouve un message par ID
   */
  static findById(id) {
    const data = messages.get(id);
    return data ? new WhatsAppMessage(data) : null;
  }

  /**
   * Trouve un message par son nom
   */
  static findByName(name) {
    const allMessages = Array.from(messages.values());
    const found = allMessages.find(msg => msg.name.toLowerCase() === name.toLowerCase());
    return found ? new WhatsAppMessage(found) : null;
  }

  /**
   * Récupère tous les messages (tous tenants)
   */
  static getAll() {
    return Array.from(messages.values()).map(data => new WhatsAppMessage(data));
  }

  /**
   * Trouve tous les messages d'un tenant
   */
  static findByTenant(tenantId, filters = {}) {
    const allMessages = Array.from(messages.values());
    let filtered = allMessages.filter(msg => msg.tenantId === tenantId);

    // Filtrer par type
    if (filters.type) {
      filtered = filtered.filter(msg => msg.type === filters.type);
    }

    // Filtrer par status
    if (filters.status) {
      filtered = filtered.filter(msg => msg.status === filters.status);
    }

    // Trier par date de mise à jour (plus récent en premier)
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return filtered.map(data => new WhatsAppMessage(data));
  }

  /**
   * Compte le nombre de messages d'un tenant
   */
  static countByTenant(tenantId, filters = {}) {
    return WhatsAppMessage.findByTenant(tenantId, filters).length;
  }

  /**
   * Trouve tous les messages (admin uniquement)
   */
  static findAll() {
    return Array.from(messages.values()).map(data => new WhatsAppMessage(data));
  }

  /**
   * Crée un nouveau message
   */
  static create(data) {
    const message = new WhatsAppMessage(data);
    return message.save();
  }

  /**
   * Met à jour un message existant
   */
  static update(id, updates) {
    const message = WhatsAppMessage.findById(id);
    if (!message) {
      throw new Error(`Message ${id} introuvable`);
    }

    // Appliquer les mises à jour
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'createdAt') {
        message[key] = updates[key];
      }
    });

    return message.save();
  }

  /**
   * Supprime un message
   */
  static deleteById(id) {
    const message = WhatsAppMessage.findById(id);
    if (!message) {
      throw new Error(`Message ${id} introuvable`);
    }
    return message.delete();
  }

  /**
   * Archive un message (soft delete)
   */
  static archive(id) {
    return WhatsAppMessage.update(id, { status: 'archived' });
  }

  /**
   * Active un message
   */
  static activate(id) {
    return WhatsAppMessage.update(id, { status: 'active' });
  }

  /**
   * Remplace les variables MAX par les valeurs fournies
   * Ex: "Bonjour {{prenom}}" + {prenom: "Jean"} → "Bonjour Jean"
   */
  interpolateVariables(values) {
    let text = this.messageText;

    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      text = text.replace(regex, value);
    });

    return text;
  }

  /**
   * Construit le payload d'un bouton pour ce message
   */
  buildButtonPayload(action, leadId, additionalContext = {}) {
    // Format: action={{action}}|tenant={{tenantId}}|lead={{leadId}}|type={{type}}|ctx={{contextJson}}
    let payload = `${action}|tenant=${this.tenantId}|lead=${leadId}|type=${this.type}`;

    // Ajouter le contexte additionnel si fourni
    if (Object.keys(additionalContext).length > 0) {
      const ctxJson = JSON.stringify(additionalContext);
      payload += `|ctx=${encodeURIComponent(ctxJson)}`;
    }

    return payload;
  }

  /**
   * Vide le store (utile pour les tests)
   */
  static clearAll() {
    messages.clear();
  }
}

/**
 * Génère un ID unique pour un message
 */
function generateId() {
  return 'msg_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Extrait les variables d'un texte
 * Ex: "Bonjour {{prenom}}, RDV le {{date}}" → ['prenom', 'date']
 */
function extractVariables(text) {
  const regex = /{{(\w+)}}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)]; // Dédupliquer
}

export default WhatsAppMessage;
