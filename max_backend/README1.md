🚀 Vision générale
M.A.X. (MaCréa Assistant eXpert) est le cerveau intelligent du MaCréa CRM,
 une solution CRM basée sur EspoCRM, enrichie par une IA capable de créer, analyser et automatiser.
C’est un tableau de bord interactif connecté à EspoCRM et à n8n,
 composé de 4 onglets actifs :
Reporting → suivi des indicateurs et de la performance.


Automatisation → création et exécution des workflows IA.


Espace M.A.X. → chat, suggestions et actions intelligentes.


CRM → exploration et gestion des leads en temps réel.


M.A.X. agit comme un chef d’orchestre intelligent, reliant l’analyse, la création et l’action IA au sein d’un même environnement.
🧩 Architecture fonctionnelle à vérifier
1. MaCréa CRM (socle EspoCRM)
Le cœur de la donnée.
 EspoCRM structure les entités : Leads, Contacts, Campagnes, Messages, Activités.
 M.A.X. s’y connecte via API pour :
lire les informations clients,


créer ou mettre à jour des fiches,


insérer des messages IA générés dans Messages HTML,


appliquer des tags,


et récupérer les données pour le reporting.



🏗️ Architecture multi-tenant (versions & droits)
Chaque tenant (marque/activité) active une version adaptée à son métier.
 Les droits et capacités IA varient selon la version.
1) M.A.X. Standard (inclus CRM)
Accès : Dashboard, Reporting, Automatisation (de base), Espace M.A.X., CRM.


Création IA : newsletters / messages / scénarios en mode Assisté (brouillons).


Données : ne crée pas de champs → peut lire/écrire tags, notes, statuts.


Automatisations : scénarios simples (Relance J+3, Confirmation RDV, Qualification lead).


WhatsApp : génération de messages (assisté), planification via n8n.


Appels IA : non inclus (affiché, mais verrouillé).


Ciblage : filtres CRM + segments standards.


Tokens : 100/mois (ex. Standard) + packs.


Idéal pour démarrer : analyser, créer, planifier, sans modifier le schéma CRM.

2) Extension “Fiche métier” (MAX Fields Rebuild)
But : adapter le CRM au métier (logistique, e-commerce, beauté, coaching…).


Capacités :


MAX Fields Rebuild : propose et prépare une structure de champs métier (pipelines, étapes, attributs clés), soumise à validation avant application.


Création de modèles Créa spécialisés (templates & ton de marque).


Routines IA métier (suggestions & KPIs pertinents).


Sécurité : en MVP1, toute modification de schéma passe en Assisté (projet de migration + confirmation).


Standard vs Extension :


Standard : pas de création de champs, tags seulement.


Extension Fiche métier : peut proposer la création/migration de champs (via “MAX Fields Rebuild”), avec validation humaine.


Concrètement : “M.A.X., propose la fiche métier Logistique” → plan de champs (ex. Incoterm, DTD, poids, statut colis), tags associés, vues recommandées.

3) M.A.X. Logistique — Version PRO (tenant “Logistique”)
Tout Standard + Fiche métier activé (Assisté).


Appels IA voix naturelle : 1h incluse / mois (scénarios n8n : relance devis, confirmation, livraison).


Modes :


Assisté → préparation du script + planification.


Automatique → exécution, transcription courte, tag post-appel.


Automatisations métier : relances devis, alertes transport, suivis D-J/J+1.


Créa spécialisée : mails “devis”, WhatsApp “suivi colis”, SMS “avis de passage”.


KPIs logistiques dans Reporting : devis traités, taux de réponse, délais moyen de confirmation.


Tokens : consommation par action (appels > auto, relances > auto, créa > assisté).


Droits schéma : via MAX Fields Rebuild (Assisté) → proposition de champs/logique métier, validation requise avant création réelle.


Remarque : l’“heure d’appels IA” correspond à une enveloppe (ex. ~30 appels de 2 min), affichée dans le Budget IA + notifications d’usage.

4) M.A.X. E-commerce — Version PRO (tenant “E-commerce”)
Tout Standard + Fiche métier activé (Assisté).


Créa : newsletters produit, campagnes offre, WhatsApp post-achat.


Automatisations : panier abandonné, feedback J+3, cross-sell J+15.


KPIs : taux d’ouverture/clic, réponses WhatsApp, conversions par campagne.


Droits schéma : via MAX Fields Rebuild (Assisté) pour ajouter champs catalogue/produit (si nécessaire), validation requise.


(Autres verticaux analogues : Beauté, Coaching — même logique.)

🎛️ Modes M.A.X. (au cœur de l’UX)
🟢 Conseil : analyse & suggestions (quasi gratuit en tokens).


🟡 Assisté : M.A.X. prépare (brouillons, plans, scripts) → tu valides.


🔴 Automatique : M.A.X. exécute (envoi, workflows, appels) → coût plus élevé.


UI :
Sélecteur global (Conseil / Assisté / Auto).


Chaque carte montre Mode, Coût, Solde après.


Garde-fous :


Conseil = lecture seule,


Assisté = brouillons + “MAX Fields Rebuild” toujours soumis à validation,


Auto = double confirmation + rollback + remboursement tokens si échec.






🧭 Modes d’utilisation M.A.X.
Mode
Description
Coût
Contrôle
🟢 Conseil
M.A.X. observe, analyse, suggère. Aucune exécution.
Faible
100 % humain
🟡 Assisté
M.A.X. prépare la tâche (texte, automatisation, plan). Tu valides avant exécution.
Moyen
Co-création
🔴 Automatique
M.A.X. agit seul : création, envoi, exécution n8n.
Élevé
IA autonome

🔘 Un sélecteur global en haut du tableau permet de choisir le mode actif (Conseil / Assisté / Auto).
Chaque carte affiche :
le mode utilisé,


le coût token estimé,


et le solde restant.
💰 Système de Tokens
Chaque action IA consomme un nombre de tokens proportionnel à sa complexité.


Plan
Prix
Tokens/mois
Accès
Standard
Inclus CRM
100
IA de base + reporting + chat ( MAX simple rôle API)
Pro
99 €/mois
500
Créa + Automate complet+fields builder ( MAX super admin) 
Studio
199 €/mois
1500
Accès complet et prioritaire
Packs supplémentaires
à la demande
+500
Recharge instantanée

Coûts test  (MVP1)
Action
Mode
Coût
Création newsletter
Assisté
10 tokens
Message WhatsApp
Assisté
5 tokens
Automatisation n8n
Assisté
8 tokens
Relance auto (n8n)
Auto
15 tokens
Appel IA
Auto
100 tokens
Analyse de leads
Conseil
2 tokens


🔹 Onglet 1 — Reporting
Le module Reporting est opérationnel.
 Il se connecte à EspoCRM pour afficher les indicateurs clés :
Fonctionnalités actuelles :
📊 Nombre total de leads (actifs, nouveaux, archivés).


⏱️ Timeline des dernières activités.


📈 Suivi des campagnes (créées, ouvertes, cliquées).


📬 Messages envoyés / en attente / à relancer.


🔔 Notification automatique quand une nouvelle action IA est exécutée.


🔁 Actualisation temps réel du flux d’activité (via SSE).


M.A.X. visualise les données, en tire des suggestions (“12 leads non relancés”) et affiche un bouton “Créer une action IA” directe.

🔹 Onglet 2 — Automatisation
Le module Automatisation gère les workflows IA reliés à n8n.
Fonctionnalités existantes :
Liste des automatisations actives (relances, confirmations, notifications).


Bouton “Créer une nouvelle automatisation” (déclenche M.A.X. en mode Assisté).


Sélection de scénario (Relance devis / Confirmation RDV / Qualification lead).


Affichage du coût token et statut (planifié, en cours, terminé).


Notification instantanée en cas de succès ou échec.


En mode Auto, M.A.X. exécute l’action via n8n et affiche le résultat dans la timeline.
 En mode Assisté, il prépare le scénario et attend validation.

🔹 Onglet 3 — Espace M.A.X. (Chat & Suggestions)
C’est le centre IA principal — un espace conversationnel et proactif.
Déjà en place :
💬 Chat IA interactif : poser des questions, lancer des actions (“Crée une newsletter QMix”).


🧠 Suggestions IA : apparaissent automatiquement selon les données CRM (“Relancer les prospects inactifs depuis 5 jours ?”).


🪄 Boutons d’action rapides : “Créer une campagne”, “Analyser les leads”, “Voir les automatisations”.


📍Historique des commandes IA : conservé pour relire les réponses ou rejouer une action.


L’Espace M.A.X. fonctionne en mode conseil ou assisté selon le contexte.
 Les suggestions s’actualisent à chaque mise à jour de données CRM.

🔹 Onglet 4 — CRM
L’onglet CRM permet d’explorer directement la base EspoCRM depuis le tableau M.A.X.
Déjà opérationnel :
🔍 Recherche avancée de leads, filtres (actif, chaud, froid, à relancer).


🧾 Accès rapide aux fiches clients (nom, email, statut, tags).


🧩 Bouton “Analyser avec M.A.X.” → l’IA lit la fiche et propose des actions personnalisées.


🪪 Synchronisation instantanée avec EspoCRM (via API).


🧠 Classement intelligent des leads selon leur potentiel ou activité récente.


Cet onglet est la base du travail IA : les données lues ici alimentent le Reporting, les Suggestions et les Automatisations.

🎨 Espace Créa M.A.X. ( à crer)
Le studio IA de création de campagnes.
 Permet à l’utilisateur de créer des contenus cohérents avec son CRM.
Fonctionnalités MVP1 :
Choisir un modèle (newsletter, message, campagne mixte).


M.A.X. rédige le contenu et l’enregistre dans Messages HTML d’Espocrm.


L’utilisateur remplace les images (placeholder [Votre image ici]).


Aperçu + validation + planification de l’envoi.


Possibilité d’associer une automatisation n8n.


Modèles disponibles :
Newsletter “Annonce produit”


Routine beauté


Message WhatsApp “remerciement”


Relance devis J+3


Confirmation RDV



📈 Budget IA & Reporting global
Un module intégré dans le tableau de bord M.A.X. :
💰 Tokens restants + prévision d’épuisement.


📊 Répartition des dépenses (création, automatisation, appels).


🧮 Graphique d’usage par semaine.


🧠 Recommandations IA :


 “Vos campagnes email performent mieux que vos appels. Priorisez le canal e-mail.”



Le Budget IA agit comme un planificateur de ressources intelligent.

🔒 Sécurité & Transparence
Coût affiché avant exécution.


Logs enregistrés dans EspoCRM.


Remboursement automatique si échec.


Données et tokens isolés par tenant.


Respect du RGPD et des opt-in marketing.



🧱 Architecture multi-tenant
Niveau
Fonction
Exemple
M.A.X. Standard
IA universelle + tableau de bord interactif
—
Extension métier
IA spécialisée (logistique, e-commerce, beauté…)
/brains/ecommerce/
Tenant
Instance client (EspoCRM, tokens, n8n, data)
QMix Paris
Actions IA
Créations, automatisations, reporting
Campagne, relance, message


🧾 Résumé stratégique
Élément
Rôle clé
MaCréa CRM (EspoCRM)
Cœur des données clients
M.A.X. Standard
Cerveau IA + tableau de bord temps réel
Reporting
Suivi dynamique des performances
Automatisation
Gestion et exécution des workflows
Espace M.A.X.
Chat + suggestions IA
CRM
Recherche et lecture intelligente des leads
Modes IA
Conseil / Assisté / Automatique
Tokens
Monnaie interne d’usage IA
Budget IA
Pilotage stratégique de la consommation


