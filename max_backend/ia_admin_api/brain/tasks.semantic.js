// ia_admin_api/brain/tasks.semantic.js
import fetch from "node-fetch";

export const SemanticTasks = {
  /**
   * 1️⃣ Lire les leads créés à une date précise
   */
  async crmFindByDate(date = "2025-11-01") {
    const r = await fetch(`http://127.0.0.1:3005/api/crm/leads/by-date?date=${date}`).then(x => x.json());
    if (!r.ok || !r.leads?.length) {
      return { text: `Aucun lead trouvé pour le ${date}.`, total: 0 };
    }

    const lines = r.leads.map(l => `
──────────────
👤 ${l.prénom || ''} ${l.nom || ''}
📧 ${l.email || '—'}
📞 ${l.téléphone || '—'}
🎯 Statut : ${l.statut || '—'}
💡 Source : ${l.source || '—'}
📅 Créé le : ${l.dateCréation || '—'}
──────────────`).join('\n');

    const stats = {
      total: r.leads.length,
      status: {},
      source: {}
    };
    for (const l of r.leads) {
      stats.status[l.statut] = (stats.status[l.statut] || 0) + 1;
      stats.source[l.source] = (stats.source[l.source] || 0) + 1;
    }
    const summary = `📊 ${stats.total} leads — ${Object.entries(stats.status).map(([k,v]) => `${k}: ${v}`).join(', ')} — Sources: ${Object.entries(stats.source).map(([k,v]) => `${k}: ${v}`).join(', ')}`;

    return { text: `✅ Voici les leads créés le ${date} :\n${lines}\n\n${summary}`, total: r.leads.length };
  },

  /**
   * 2️⃣ Lire le dernier lead complet
   */
  async crmReadLatestLead() {
    const r = await fetch("http://127.0.0.1:3005/api/crm/lead/latest").then(x => x.json());
    if (!r.ok || !r.lead) return { text: "Aucun lead trouvé." };
    const l = r.lead;
    const fields = `
📋 **Dernier lead ajouté**
────────────────────────
👤 ${l.firstName || ''} ${l.lastName || ''}
📧 ${l.emailAddress || '—'}
📞 ${l.phoneNumber || '—'}
🏢 Société : ${l.accountName || '—'}
🎯 Statut : ${l.status || '—'}
💡 Source : ${l.source || '—'}
📅 Créé le ${(l.createdAt || '').slice(0,10)}
📝 Note : ${l.description || '—'}
────────────────────────`;
    return { text: fields, total: 1 };
  },

  /**
   * 3️⃣ Lire la structure complète du module Lead (tous les champs dynamiques)
   */
  async crmDescribeStructure() {
    const url = `${process.env.ESPO_BASE}/api/v1/Lead/describe`;
    const auth = 'Basic ' + Buffer.from(`${process.env.ESPO_USERNAME}:${process.env.ESPO_PASSWORD}`).toString('base64');
    const r = await fetch(url, { headers: { 'Authorization': auth } }).then(x => x.json());
    const champs = Object.keys(r.fields || {}).join(', ');
    return { text: `📘 Champs disponibles dans le module Lead :\n${champs}` };
  },

  /**
   * 4️⃣ Analyse statistique globale
   */
  async crmAnalyzeStats() {
    const r = await fetch(`http://127.0.0.1:3005/api/crm/leads?max=500`).then(x => x.json());
    if (!r.ok || !r.leads?.length) return { text: "Aucun lead à analyser." };
    const byStatus = {};
    const bySource = {};
    for (const l of r.leads) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      bySource[l.source] = (bySource[l.source] || 0) + 1;
    }
    const summary = `
📊 Analyse des leads actuels :
🎯 Statuts : ${Object.entries(byStatus).map(([k,v]) => `${k}: ${v}`).join(', ')}
💡 Sources : ${Object.entries(bySource).map(([k,v]) => `${k}: ${v}`).join(', ')}
`;
    return { text: summary };
  },

  /**
   * 5️⃣ Proposition de tags selon les statuts et sources
   */
  async crmSuggestTags() {
    const r = await fetch(`http://127.0.0.1:3005/api/crm/leads?max=100`).then(x => x.json());
    if (!r.ok || !r.leads?.length) return { text: "Aucun lead disponible pour suggérer des tags." };

    const tags = new Set();
    for (const l of r.leads) {
      if (/instagram|facebook/i.test(l.source)) tags.add('social_media');
      if (/contact|formulaire/i.test(l.source)) tags.add('formulaire');
      if (/process/i.test(l.status)) tags.add('à_relancer');
      if (/new/i.test(l.status)) tags.add('nouveau');
    }
    return { text: `🏷️ Tags suggérés selon les leads : ${[...tags].join(', ') || 'aucun'}` };
  },

  /**
   * 6️⃣ Exploration dynamique du CRM
   */
  async crmDynamicExplorer(module = "Lead") {
    try {
      const base = process.env.ESPO_BASE;
      const auth = 'Basic ' + Buffer.from(`${process.env.ESPO_USERNAME}:${process.env.ESPO_PASSWORD}`).toString('base64');

      // 1. Lister les modules disponibles
      const modulesRes = await fetch(`${base}/api/v1/Metadata`, { headers: { Authorization: auth } });
      const metadata = await modulesRes.json();
      const scopes = Object.keys(metadata.scopes || {});
      if (!scopes.includes(module)) {
        return { text: `❌ Le module "${module}" n'existe pas. Modules disponibles : ${scopes.join(', ')}` };
      }

      // 2. Décrire le module sélectionné
      const descRes = await fetch(`${base}/api/v1/${module}/describe`, { headers: { Authorization: auth } });
      const desc = await descRes.json();

      // 3. Préparer un résumé clair
      const fields = Object.entries(desc.fields || {}).map(([key, val]) => {
        const type = val.type || "string";
        const label = val.label || key;
        return `• ${label} (${key}) – type: ${type}`;
      }).join('\n');

      const relations = Object.entries(desc.links || {}).map(([key, val]) => {
        return `🔗 ${key} → ${val.entity}`;
      }).join('\n');

      const reply = `
📘 **Exploration du module ${module}**
──────────────────────────────
Champs disponibles :
${fields}

Relations :
${relations}
──────────────────────────────
🧭 Vous pouvez interroger un champ précis ou filtrer par critère, ex :
"Montre-moi tous les ${module.toLowerCase()} avec statut 'In Process'"
`;

      return { text: reply };

    } catch (err) {
      console.error("Erreur exploration CRM:", err?.message || err);
      return { text: "Erreur lors de l'exploration du CRM." };
    }
  }
};
