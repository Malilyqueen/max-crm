
# Stratégies CRM MAX — Scénarios et Automatisations

## Contexte
Ce document regroupe les stratégies CRM et les scénarios intelligents que MAX doit utiliser pour analyser, segmenter et automatiser selon chaque type de métier.

## 1. Logistique / Transport / Fret
### Objectifs
- Qualification rapide
- Urgences détectées
- Automatisation des confirmations

### Scénarios
- Détection du type d’envoi (léger, groupage, conteneur)
- Analyse des champs obligatoires
- Déclencheur SMS/WhatsApp si urgence
- Mise à jour statut : `rdv_confirmé`, `devis_envoyé`

## 2. E-Commerce
### Objectifs
- Suivi prospects B2B
- Détection de maturité digitale
- Scoring automatique

### Scénarios
- Tagging auto : chaud / tiède / froid
- Propositions d’Email nurturing
- Automatisation n8n : mail + WhatsApp

## 3. Coaching & Services
### Objectifs
- Filtrer curieux vs clients réels
- Automatiser les relances
- Optimiser conversion rendez-vous

### Scénarios
- Séquence de nurturing 3 étapes
- Reminder automatique avant appel
- Mise à jour : `rdv_show / no_show`

## 4. Artisans (Serrurier, Immobilier, Dépannage)
### Objectifs
- Réactivité immédiate
- Détection urgence
- Conversion rapide

### Scénarios
- Détection : urgence / non-urgence
- Appel IA auto si urgence
- Changement automatique du statut

## 5. Entreprises B2B
### Objectifs
- Analyse dossier
- Stratégie pipeline
- Propositions automatiques

### Scénarios
- Analyse PDF (si disponible)
- Résumé auto dans description
- Tagging par segmentation secteur
