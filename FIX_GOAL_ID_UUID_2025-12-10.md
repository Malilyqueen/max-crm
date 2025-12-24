# CORRECTIF: Utilisation des UUIDs pour les objectifs et notes

**Date** : 2025-12-10
**Problème** : M.A.X. inventait des goal_id comme "1" ou "300_utilisateurs_actifs_avril" au lieu d'utiliser les vrais UUIDs de la base de données
**Impact** : Les opérations d'archivage échouaient avec l'erreur `invalid input syntax for type uuid`

---

## 🔍 Analyse du problème

### Symptôme
```
[tenantGoals] ❌ Erreur archivage objectif: {
  message: 'invalid input syntax for type uuid: "300_utilisateurs_actifs_avril"'
}
```

### Cause racine
Lorsque les objectifs étaient chargés au démarrage de la conversation, seul le **contenu** était extrait (texte, valeur cible, deadline), mais **PAS l'ID UUID**.

Résultat : M.A.X. ne voyait jamais les vrais IDs et devait donc les "inventer" quand il voulait archiver un objectif.

---

## ✅ Correctifs appliqués

### 1. Ajout de l'ID dans le chargement des objectifs

**Fichier** : [chat.js:3656-3664](max_backend/routes/chat.js#L3656-L3664)

**Avant** :
```javascript
goals = goalsResult.goals.map(goal => ({
  text: goal.goal_text,
  target: goal.target_value,
  current: goal.current_value,
  unit: goal.unit,
  deadline: goal.deadline,
  formatted: formatGoalForDisplay(goal)
}));
```

**Après** :
```javascript
goals = goalsResult.goals.map(goal => ({
  id: goal.id,  // ✅ AJOUT CRITIQUE
  text: goal.goal_text,
  target: goal.target_value,
  current: goal.current_value,
  unit: goal.unit,
  deadline: goal.deadline,
  formatted: formatGoalForDisplay(goal)
}));
```

---

### 2. Affichage des IDs dans le system prompt

**Fichier** : [chat.js:3760-3766](max_backend/routes/chat.js#L3760-L3766)

**Avant** :
```javascript
**🎯 Objectifs actifs (${goals.length})** :
${goals.map((g, i) => `  ${i + 1}. ${g.formatted}`).join('\n')}

🔒 **Utilise ces objectifs pour adapter TOUTES tes recommandations**
```

**Après** :
```javascript
**🎯 Objectifs actifs (${goals.length})** :
${goals.map((g, i) => `  ${i + 1}. ${g.formatted} [ID: ${g.id}]`).join('\n')}

🔒 **Utilise ces objectifs pour adapter TOUTES tes recommandations**
🔑 **Pour modifier/archiver un objectif, utilise toujours son ID UUID exact**
```

---

### 3. Même correctif pour les notes

**Fichier** : [chat.js:3783-3789](max_backend/routes/chat.js#L3783-L3789)

**Ajout** :
```javascript
**📝 Notes actives (${noteEntries.length} notes)** :
${noteEntries.map((n, i) => `  ${i + 1}. **${n.title}** : ${n.content} [ID: ${n.id}]`).join('\n')}

🔒 **Ces notes décrivent le contexte actuel, utilise-les pour adapter ta stratégie**
🔑 **Pour archiver une note, utilise toujours son ID exact**
```

---

## 📊 Exemple de ce que M.A.X. voit maintenant

### Avant (sans IDs) :
```
🎯 Objectifs actifs (3) :
  1. Atteindre 250 utilisateurs d'ici fin février 2026 (0/250 utilisateurs)
  2. Atteindre 500 utilisateurs d'ici fin mars 2026 (0/500 utilisateurs)
  3. Atteindre 300 utilisateurs d'ici fin avril (0/300 utilisateurs)
```

M.A.X. ne pouvait pas savoir quels étaient les vrais IDs → Il les inventait.

### Après (avec IDs) :
```
🎯 Objectifs actifs (3) :
  1. Atteindre 250 utilisateurs d'ici fin février 2026 (0/250 utilisateurs) [ID: 7e7691be-0801-4596-bd49-39dad17cec83]
  2. Atteindre 500 utilisateurs d'ici fin mars 2026 (0/500 utilisateurs) [ID: a1b2c3d4-1234-5678-9abc-def012345678]
  3. Atteindre 300 utilisateurs d'ici fin avril (0/300 utilisateurs) [ID: f9e8d7c6-abcd-4321-fedc-ba9876543210]

🔑 Pour modifier/archiver un objectif, utilise toujours son ID UUID exact
```

M.A.X. voit maintenant les vrais UUIDs et peut les utiliser dans ses tool calls.

---

## ✅ Résultat

M.A.X. peut maintenant :
- ✅ Voir les vrais UUIDs de chaque objectif
- ✅ Voir les vrais UUIDs de chaque note
- ✅ Utiliser ces UUIDs dans les tools `archive_tenant_goal` et `archive_long_term_note`
- ✅ Archiver correctement les doublons sans erreur SQL

---

## 🧪 Test à effectuer

Demande à M.A.X. :

> "MAX, archive l'objectif '300 utilisateurs d'ici fin avril' en utilisant son ID UUID."

M.A.X. devrait maintenant :
1. Identifier le bon UUID dans son contexte
2. Appeler `archive_tenant_goal` avec l'UUID correct
3. Réussir l'opération sans erreur

---

**Prochaine étape** : Une fois le serveur redémarré, tu peux demander à M.A.X. de faire le nettoyage complet de la mémoire.
