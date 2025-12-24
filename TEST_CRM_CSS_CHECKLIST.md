# ✅ CHECKLIST - Test CSS Enhancement CRM

**Date** : 2025-12-11
**URL à tester** : http://localhost:5174/crm
**Status serveur** : ✅ Frontend lancé sur port 5174

---

## 🎯 OBJECTIF

Valider que le **nouveau design cards** du CRM fonctionne correctement et correspond au Demoboard.

---

## 📋 CHECKLIST DE TEST

### 1. ✅ Affichage de base

- [ ] La page CRM charge sans erreur
- [ ] Les leads s'affichent en **cards** (pas en table HTML)
- [ ] Chaque card a un fond gradient `from-slate-800 to-slate-900`
- [ ] Les borders sont visibles `border-slate-700/50`

### 2. 🎨 Avatar avec score badge

- [ ] Chaque card affiche un **avatar circulaire** avec les initiales du lead
- [ ] L'avatar a un gradient `from-macrea-cyan/20 to-macrea-violet/20`
- [ ] Si le lead a un score > 0, un **badge numérique** apparaît en haut à droite de l'avatar
- [ ] Le badge a un gradient `from-macrea-cyan to-macrea-violet`
- [ ] Le badge a une ombre lumineuse (glow)

### 3. 📊 Informations affichées

- [ ] **Nom complet** : `firstName lastName` en gros (text-lg font-semibold)
- [ ] **Entreprise** : `@ company` si présente (text-sm text-slate-400)
- [ ] **Email** : icône `Mail` + adresse email
- [ ] **Téléphone** : icône `Phone` + numéro
- [ ] **Source** : icône `Tag` + source (si présente)
- [ ] **Date création** : icône `Clock` + date formatée

### 4. 🏷️ Tags IA

- [ ] Les **tags IA** s'affichent sous le nom (max 3 tags)
- [ ] Chaque tag a un style `bg-macrea-cyan/10 text-macrea-cyan border border-macrea-cyan/20`
- [ ] Si plus de 3 tags, affiche `+X` pour les tags restants

### 5. 🎨 Status badge

- [ ] Chaque card affiche un **status badge** coloré
- [ ] Les couleurs correspondent au statut :
  - **New** : bleu (`bg-blue-500/10 text-blue-400`)
  - **Assigned** : vert (`bg-green-500/10 text-green-400`)
  - **In Process** : jaune (`bg-yellow-500/10 text-yellow-400`)
  - **Converted** : vert émeraude (`bg-emerald-500/10 text-emerald-400`)
  - **Recycled** : gris (`bg-gray-500/10 text-gray-400`)
  - **Dead** : rouge (`bg-red-500/10 text-red-400`)

### 6. ✨ Animations Framer Motion

#### Slide in au chargement
- [ ] Les cards apparaissent avec une **animation slide-in** depuis le bas
- [ ] Les cards ont un **stagger** (apparaissent l'une après l'autre avec un délai)
- [ ] Transition fluide `opacity: 0 → 1` et `y: 20 → 0`

#### Hover effects
- [ ] Au survol d'une card, elle **scale légèrement** (1.01)
- [ ] Un **glow cyan** apparaît autour de la card au hover
- [ ] Transition fluide et smooth

#### Actions hover
- [ ] Au survol d'une card, **3 boutons d'action** apparaissent à droite :
  1. **Eye** (icône Lucide) - Fond cyan `bg-macrea-cyan/20`
  2. **MessageSquare** (icône Lucide) - Fond violet `bg-macrea-violet/20`
  3. **Zap** (icône Lucide) - Fond vert `bg-green-500/20`
- [ ] Les boutons ont une animation **scale** au hover (1.1) et au clic (0.9)
- [ ] Les boutons sont invisibles par défaut (`opacity-0`) et visibles au hover (`group-hover:opacity-100`)

### 7. 🖱️ Interactivité

- [ ] Cliquer sur une card ouvre le **panneau LeadDetail** à droite
- [ ] Le panneau affiche les détails du lead sélectionné
- [ ] Fermer le panneau fonctionne correctement
- [ ] Les notes et activités s'affichent dans le panneau

### 8. 📱 Responsive

- [ ] Les cards s'adaptent à différentes largeurs d'écran
- [ ] Les informations restent lisibles sur mobile
- [ ] Le layout ne casse pas sur petit écran

### 9. ⚡ Performance

- [ ] Le chargement des leads est rapide
- [ ] Les animations sont fluides (60 fps)
- [ ] Pas de lag au scroll
- [ ] Pas de freeze au hover

### 10. 🎨 Cohérence avec Demoboard

- [ ] Le design correspond visuellement au **DemoBoardCRM.tsx**
- [ ] Les couleurs sont cohérentes (cyan #00E5FF, violet #A855F7)
- [ ] Les gradients sont similaires
- [ ] L'expérience utilisateur est comparable

---

## 🐛 TESTS DE RÉGRESSION

### Empty state
- [ ] Si aucun lead, affiche un message "Aucun lead" avec icône `Building2`
- [ ] Le message a un glow cyan
- [ ] Animation fade-in

### Loading state
- [ ] Pendant le chargement, affiche un **spinner circulaire cyan**
- [ ] Le spinner a un glow pulsant autour

### Error state
- [ ] Si erreur, affiche un message d'erreur avec bouton "Réessayer"
- [ ] Le bouton permet de recharger les leads

---

## 📸 AVANT / APRÈS

### Avant (table HTML)
```
┌──────────────────────────────────────────────┐
│ Nom        │ Email   │ Statut  │ Actions   │
├──────────────────────────────────────────────┤
│ John Doe   │ j@...   │ New     │ Voir      │
│ Jane Smith │ jane... │ Assigned│ Voir      │
└──────────────────────────────────────────────┘
```

### Après (cards avec glows)
```
╔═══════════════════════════════════════════════╗
║  [Avatar]  John Doe @ Company                ║
║   [85]     📧 john@example.com                ║
║            📞 +33 6 12 34 56 78               ║
║            🏷️ IA │ Tech │ SaaS               ║
║                                [New] 📅 12/10 ║
║            [👁️] [💬] [⚡]  (hover actions)    ║
╚═══════════════════════════════════════════════╝
```

---

## 🚨 POINTS D'ATTENTION

1. **Framer Motion** : Vérifier que la bibliothèque est bien importée (v12.23.24)
2. **Tailwind classes** : Vérifier que les classes custom macrea-* sont bien définies dans `tailwind.config.js`
3. **Console errors** : Ouvrir DevTools et vérifier qu'il n'y a pas d'erreurs JavaScript
4. **Network requests** : Vérifier que l'appel à `/api/crm-public/leads` retourne bien 200 OK

---

## ✅ VALIDATION FINALE

Une fois tous les tests passés :
- [ ] Le CRM est **visuellement au niveau du Demoboard**
- [ ] Les animations sont **fluides et agréables**
- [ ] L'expérience utilisateur est **moderne et engageante**
- [ ] Prêt à passer au **Chat M.A.X.** (prochaine phase)

---

## 🔗 LIENS UTILES

- **Frontend** : http://localhost:5174/crm
- **Backend health** : http://localhost:3005/api/crm-public/health
- **Documentation** : [CRM_CSS_ENHANCEMENT_COMPLETED.md](CRM_CSS_ENHANCEMENT_COMPLETED.md)

---

**Bonne chance pour les tests ! 🚀**
