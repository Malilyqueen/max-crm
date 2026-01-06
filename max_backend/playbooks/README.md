# 🔧 Système de Self-Healing de M.A.X.

## Vue d'Ensemble

M.A.X. dispose maintenant d'un système intelligent de **self-healing** (auto-guérison) qui lui permet de diagnostiquer et résoudre automatiquement les problèmes techniques courants.

### Comment Ça Marche?

Quand M.A.X. rencontre un problème, il:
1. **Détecte** automatiquement l'anomalie (ex: champ non mis à jour)
2. **Consulte** un playbook de troubleshooting
3. **Applique** les solutions recommandées
4. **Informe** l'utilisateur de manière claire

## 🎯 Cas d'Usage Activés

### 1. Mise à Jour de Champ Échoue
**Symptôme**: "Nom de famille toujours 'AI Studio' au lieu de 'RAMAHA'"

**Avant le système**:
```
M.A.X.: "✅ Mis à jour avec succès!"
Utilisateur: "Mais rien n'a changé..."
M.A.X.: "Désolé, je ne comprends pas pourquoi..."
```

**Avec le système**:
```
M.A.X.: "Je vérifie... ⚠️ Le champ n'a pas changé.
        Je consulte le guide de dépannage...
        🔧 Le problème vient probablement du nom de champ.
        Je vais essayer avec le nom d'API exact: lastName"
M.A.X.: *réessaye*
M.A.X.: "✅ Maintenant c'est bon! Vérifié: RAMAHA"
```

### 2. Envoi WhatsApp Échoue
**Symptôme**: Erreur `ECONNREFUSED 127.0.0.1:5678`

**Avec le système**:
```
M.A.X.: "❌ Je ne peux pas envoyer le WhatsApp.
        🔍 Diagnostic: n8n n'est pas démarré.
        💡 Solution: Voulez-vous que je le démarre automatiquement?"
```

### 3. Template WhatsApp Incorrect
**Symptôme**: Message "test" au lieu du template configuré

**Avec le système**:
```
M.A.X.: "🤔 Vous m'avez demandé un 'message de confirmation'.
        📋 J'ai 2 templates disponibles:
        1. Confirmation RDV (WhatsApp)
        2. Confirmation Commande (Email)
        Lequel voulez-vous utiliser?"
```

## 📚 Playbooks Disponibles

| Playbook | Cas d'Usage | Status |
|----------|-------------|--------|
| **LEAD_FIELD_UPDATE_FAILED** | Champ CRM ne se met pas à jour | ✅ Actif |
| **WHATSAPP_SEND_FAILED** | Envoi WhatsApp échoue | ✅ Actif |
| EMAIL_SEND_FAILED | Envoi email échoue | 📋 À créer |
| LEAD_IMPORT_FAILED | Import CSV échoue | 📋 À créer |
| CRM_SYNC_FAILED | Connexion EspoCRM timeout | 📋 À créer |

## 🛠️ Architecture

```
┌─────────────────────────────────────────┐
│  M.A.X. exécute une action              │
│  (ex: update_lead)                      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Vérification Post-Opération            │
│  - Attendre 300ms                       │
│  - Re-lire le lead                      │
│  - Comparer expected vs actual          │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────┴───────┐
         │               │
    ✅ Succès      ❌ Échec
         │               │
         │               ▼
         │     ┌─────────────────────┐
         │     │  Consultation        │
         │     │  Playbook            │
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Diagnostic +        │
         │     │  Solutions           │
         │     └──────────┬───────────┘
         │                │
         │                ▼
         │     ┌─────────────────────┐
         │     │  Application         │
         │     │  Solution            │
         │     └──────────┬───────────┘
         │                │
         └────────────────┴───────────┐
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │  Retour Utilisateur    │
                         │  (message formaté)     │
                         └────────────────────────┘
```

## 💡 Avantages pour les Clients

### Avant (Sans Self-Healing)
- ❌ Messages d'erreur cryptiques
- ❌ Client ne sait pas quoi faire
- ❌ Ticket support nécessaire
- ❌ Frustration et perte de temps

### Après (Avec Self-Healing)
- ✅ Messages clairs et actionnables
- ✅ Solutions proposées automatiquement
- ✅ M.A.X. résout seul 80% des problèmes
- ✅ Expérience fluide et professionnelle

## 📊 Métriques

Le système collecte automatiquement:
- Nombre de consultations de playbook par type
- Taux de résolution automatique
- Temps moyen de résolution
- Problèmes non résolus (pour créer nouveaux playbooks)

## 🔍 Pour les Développeurs

### Ajouter un Nouveau Playbook

1. **Créer le fichier** dans `playbooks/`:
```bash
cp playbooks/TEMPLATE.md playbooks/YOUR_NEW_PLAYBOOK.md
```

2. **Mapper dans playbookReader.js**:
```javascript
const PLAYBOOK_MAP = {
  your_issue: 'YOUR_NEW_PLAYBOOK.md',
  // ...
};
```

3. **Ajouter dans maxTools.js**:
```javascript
enum: [
  'field_update_failed',
  'your_issue', // ← Ajouter ici
  //...
]
```

4. **Implémenter le générateur de message** (optionnel):
```javascript
function generateYourIssueMessage(context, parsed) {
  return `Message formaté...`;
}
```

### Ajouter Vérification à un Tool

```javascript
case 'your_tool': {
  // 1. Exécuter l'action
  const result = await doSomething();

  // 2. Vérifier le résultat
  await new Promise(r => setTimeout(r, 300));
  const verified = await checkResult();

  // 3. Si échec, consulter playbook
  if (verified !== expected) {
    const { consultPlaybook } = await import('../lib/playbookReader.js');
    const guidance = await consultPlaybook('your_issue', {
      field: 'example',
      expected,
      actual: verified
    }, true);

    return {
      success: false,
      error: 'VERIFICATION_FAILED',
      guidance: guidance.userMessage
    };
  }

  return { success: true, verified: true };
}
```

## 🚀 Roadmap

### Phase 1 (Actuel)
- [x] Système de playbooks
- [x] Lecture et parsing Markdown
- [x] Intégration dans maxTools
- [x] Vérification post-op update_lead
- [x] Playbook LEAD_FIELD_UPDATE_FAILED
- [x] Playbook WHATSAPP_SEND_FAILED

### Phase 2 (Prochainement)
- [ ] Playbook EMAIL_SEND_FAILED
- [ ] Playbook LEAD_IMPORT_FAILED
- [ ] Playbook CRM_SYNC_FAILED
- [ ] Dashboard métriques playbooks
- [ ] Suggestions auto-améliorations

### Phase 3 (Future)
- [ ] Machine learning sur les résolutions
- [ ] Playbooks dynamiques (auto-générés)
- [ ] API externe pour partage playbooks
- [ ] Système de contribution communautaire

## 🎓 Formation des Nouveaux Utilisateurs

### Message d'Onboarding Suggéré

> 👋 **Bienvenue dans M.A.X.!**
>
> Je dispose maintenant d'un système intelligent de détection et résolution automatique des problèmes.
>
> **Ce que cela signifie pour vous**:
> - Si quelque chose ne fonctionne pas, je vais le détecter automatiquement
> - Je vais vous expliquer clairement ce qui se passe
> - Je vais proposer des solutions concrètes
> - Dans la plupart des cas, je vais résoudre le problème seul
>
> Vous n'avez plus à vous inquiéter des erreurs techniques - je m'en occupe! 🚀

## 📞 Support

Si M.A.X. rencontre un problème qu'il ne peut pas résoudre:

1. **Il vous le dira clairement** avec contexte complet
2. **Il enregistrera l'incident** pour amélioration future
3. **Il suggérera de créer un nouveau playbook** si problème récurrent

Pour toute question sur le système:
- Consultez `playbooks/INDEX.md` pour la liste complète
- Lisez les playbooks individuels pour cas spécifiques
- Contactez l'équipe dev pour ajouter nouveaux cas

## ✨ Exemples Concrets

### Exemple 1: Problème Détecté et Résolu

**Utilisateur**: "Mets à jour le nom de famille à RAMAHA"

**M.A.X. (ancien comportement)**:
```
✅ Mis à jour avec succès!
```
*Mais le champ n'a pas changé*

**M.A.X. (nouveau comportement)**:
```
🔄 Mise à jour en cours...
⚠️ Vérification: Le champ lastName est toujours "AI Studio" au lieu de "RAMAHA"
🔧 Je consulte le guide de dépannage...
💡 Solution trouvée: Le nom de champ API exact est nécessaire
🔄 Nouvelle tentative avec lastName (API)...
✅ Succès vérifié: Le champ lastName est maintenant "RAMAHA"
```

### Exemple 2: Besoin de Clarification

**Utilisateur**: "Envoie un message de confirmation"

**M.A.X. (nouveau comportement)**:
```
🤔 J'ai besoin de précisions sur votre demande.

📋 J'ai trouvé 3 templates "confirmation":
1. Confirmation de Rendez-vous (WhatsApp)
   → Variables: prénom, date, heure
2. Confirmation de Commande (Email)
   → Variables: prénom, numéro, total
3. Confirmation de Paiement (SMS)
   → Variables: prénom, montant

Lequel souhaitez-vous utiliser? Ou préférez-vous que j'envoie un message libre?
```

---

**Date de création**: 2025-12-12
**Version**: 1.0.0
**Auteur**: M.A.X. Team
**Prochaine révision**: 2026-01-12
