# 📱 Workflow WhatsApp avec M.A.X. - Guide Complet

## Vue d'ensemble

Ce guide explique comment utiliser les templates WhatsApp avec M.A.X. pour envoyer des messages automatiquement via Twilio.

## 🎯 Workflow en 3 étapes

### Étape 1: Créer un template sur Twilio
### Étape 2: Enregistrer le template dans MAX
### Étape 3: M.A.X. envoie automatiquement

---

## 📋 Étape 1: Créer un template sur Twilio

### 1.1 Aller sur Twilio Console
- URL: https://console.twilio.com/
- Menu: **Messaging** → **Content Editor** → **WhatsApp Templates**

### 1.2 Créer un nouveau template
Cliquez sur **"Create Template"** et remplissez:

**Exemple: Template de confirmation RDV**
```
Nom du template: appointment_confirm_text_v1
Type: TEXT (ou TEXT + MEDIA si vous voulez ajouter une image)
Langue: French (fr)

Message:
Bonjour {{1}},

Votre rendez-vous est confirmé le {{2}} à {{3}}.

Nous avons hâte de vous rencontrer !

Variables:
{{1}} = prénom du client
{{2}} = date du RDV
{{3}} = heure du RDV
```

### 1.3 Soumettre pour approbation
- Twilio doit approuver votre template (généralement sous 24h)
- Une fois approuvé, vous recevez un **ContentSid** (ex: `HX8903819c78549d63782e7209d9ce8b8c`)

---

## 🔧 Étape 2: Enregistrer le template dans MAX

### 2.1 Via l'API REST

Une fois votre template Twilio approuvé, enregistrez-le dans MAX:

```powershell
# Créer le message WhatsApp dans MAX
Invoke-WebRequest -Uri "http://localhost:3005/api/whatsapp/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "tenantId": "macrea",
    "name": "Confirmation RDV",
    "type": "appointment",
    "messageText": "Bonjour {{prenom}},\n\nVotre rendez-vous est confirmé le {{date}} à {{heure}}.\n\nNous avons hâte de vous rencontrer !",
    "variables": ["prenom", "date", "heure"],
    "contentSid": "HX8903819c78549d63782e7209d9ce8b8c",
    "buttons": []
  }'

# Réponse:
# {
#   "success": true,
#   "message": {
#     "id": "msg_9c9539c190018a32",
#     "name": "Confirmation RDV",
#     "status": "draft",
#     ...
#   }
# }
```

### 2.2 Activer le message

```powershell
# Activer le message (le passer de "draft" à "active")
Invoke-WebRequest -Uri "http://localhost:3005/api/whatsapp/messages/msg_9c9539c190018a32/activate" `
  -Method POST `
  -ContentType "application/json"

# Réponse:
# {
#   "success": true,
#   "message": {
#     "id": "msg_9c9539c190018a32",
#     "status": "active"
#   }
# }
```

✅ **C'est fait!** Votre template est maintenant utilisable par M.A.X.

---

## 🤖 Étape 3: M.A.X. envoie automatiquement

### 3.1 Dans le front M.A.X., vous pouvez maintenant dire:

**Exemple 1: Envoyer à un lead spécifique**
```
Vous: "M.A.X., envoie la confirmation RDV à Jean Dupont"
```

M.A.X. va automatiquement:
1. ✅ Chercher le lead "Jean Dupont" dans EspoCRM
2. ✅ Récupérer son téléphone (`+33648662734`)
3. ✅ Récupérer les variables depuis le lead:
   - `prenom` → depuis `firstName`
   - `date` → depuis le prochain `Meeting.dateStart` formaté en `15/12/2025`
   - `heure` → depuis le prochain `Meeting.dateStart` formaté en `14h30`
4. ✅ Envoyer le message WhatsApp via Twilio

**Exemple 2: Envoyer avec des variables personnalisées**
```
Vous: "M.A.X., envoie la confirmation RDV à Pierre Martin avec date 20/12/2025 et heure 10h00"
```

M.A.X. va utiliser les variables que vous fournissez au lieu de les extraire automatiquement.

**Exemple 3: Lister les templates disponibles**
```
Vous: "M.A.X., quels messages WhatsApp je peux envoyer ?"
```

M.A.X. utilisera l'outil `list_whatsapp_templates` pour afficher tous les templates actifs.

---

## 🎨 Exemples de templates

### Template 1: Confirmation RDV (TEXT only)
```javascript
{
  name: "Confirmation RDV",
  type: "appointment",
  variables: ["prenom", "date", "heure"],
  contentSid: "HX8903819c78549d63782e7209d9ce8b8c"
}
```

**Utilisation:**
```
M.A.X., envoie la confirmation RDV à Marie Dubois
```

---

### Template 2: Relance J+3 (TEXT only)
```javascript
{
  name: "Relance J+3",
  type: "follow_up",
  variables: ["prenom", "produit"],
  contentSid: "HXabcdef1234567890"
}
```

**Créer dans MAX:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3005/api/whatsapp/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "tenantId": "macrea",
    "name": "Relance J+3",
    "type": "follow_up",
    "messageText": "Bonjour {{prenom}},\n\nVous avez manifesté un intérêt pour {{produit}}.\n\nSouhaitez-vous des informations complémentaires ?",
    "variables": ["prenom", "produit"],
    "contentSid": "HXabcdef1234567890",
    "buttons": []
  }'
```

**Utilisation:**
```
M.A.X., envoie la relance J+3 à tous les leads en attente
```

---

### Template 3: Panier abandonné (TEXT + BUTTONS)
```javascript
{
  name: "Panier abandonné",
  type: "cart",
  variables: ["prenom", "produits", "montant"],
  buttons: [
    { type: "URL", text: "Finaliser ma commande", url: "https://shop.macrea.fr/cart" },
    { type: "PHONE_NUMBER", text: "Appeler le support", phoneNumber: "+33123456789" }
  ],
  contentSid: "HXghi789xyz456"
}
```

**Créer dans MAX:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3005/api/whatsapp/messages" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "tenantId": "macrea",
    "name": "Panier abandonné",
    "type": "cart",
    "messageText": "Bonjour {{prenom}},\n\nVous avez laissé {{produits}} dans votre panier ({{montant}}).\n\nFinalisez votre commande maintenant !",
    "variables": ["prenom", "produits", "montant"],
    "contentSid": "HXghi789xyz456",
    "buttons": [
      { "type": "URL", "text": "Finaliser ma commande", "url": "https://shop.macrea.fr/cart" },
      { "type": "PHONE_NUMBER", "text": "Appeler le support", "phoneNumber": "+33123456789" }
    ]
  }'
```

**Utilisation:**
```
M.A.X., envoie le rappel panier abandonné à Sophie Laurent
```

---

## 🔍 Mapping automatique des variables

M.A.X. extrait automatiquement les variables depuis EspoCRM. Voici le mapping:

| Variable WhatsApp | Champ EspoCRM | Exemple |
|-------------------|---------------|---------|
| `prenom` | `firstName` | "Jean" |
| `nom` | `lastName` | "Dupont" |
| `nom_complet` | `name` | "Jean Dupont" |
| `email` | `emailAddress` | "jean@example.com" |
| `telephone` | `phoneNumber` | "+33 6 48 66 27 34" |
| `entreprise` | `accountName` | "MaCréa Design" |
| `date` | `Meeting.dateStart` | "15/12/2025" |
| `heure` | `Meeting.dateStart` | "14h30" |
| `produits` | `produits` (custom) | "Crème hydratante" |
| `montant` | `opportunityAmount` | "450€" |
| `statut` | `status` | "Qualified" |
| `secteur` | `secteurInfere` | "E-commerce" |
| `objectifs` | `objectifsClient` | "Augmenter CA" |

**Note:** Si une variable n'est pas trouvée automatiquement, vous pouvez la fournir manuellement dans votre demande à M.A.X.

---

## ⚙️ Outils M.A.X. disponibles

### 1. `list_whatsapp_templates`
Liste tous les templates WhatsApp disponibles.

**Utilisation dans le front:**
```
M.A.X., montre-moi les templates WhatsApp
M.A.X., quels messages je peux envoyer ?
M.A.X., liste les messages WhatsApp actifs
```

**Réponse M.A.X.:**
```json
{
  "success": true,
  "count": 3,
  "templates": [
    {
      "id": "msg_9c9539c190018a32",
      "name": "Confirmation RDV",
      "type": "appointment",
      "status": "active",
      "variables": ["prenom", "date", "heure"]
    },
    {
      "id": "msg_abc123...",
      "name": "Relance J+3",
      "type": "follow_up",
      "status": "active",
      "variables": ["prenom", "produit"]
    },
    {
      "id": "msg_def456...",
      "name": "Panier abandonné",
      "type": "cart",
      "status": "active",
      "variables": ["prenom", "produits", "montant"]
    }
  ]
}
```

---

### 2. `send_whatsapp_template`
Envoie un message WhatsApp à un lead en utilisant un template.

**Utilisation dans le front:**
```
M.A.X., envoie la confirmation RDV à Jean Dupont
M.A.X., envoie le message de relance à ce lead
M.A.X., envoie la confirmation à tous les leads avec RDV demain
```

**Paramètres:**
- `messageName` (obligatoire): Nom du template WhatsApp
- `leadIdentifier` (obligatoire): ID ou nom du lead
- `variables` (optionnel): Variables personnalisées
- `autoResolve` (défaut: true): Extraire automatiquement les variables depuis EspoCRM

**Réponse M.A.X.:**
```json
{
  "success": true,
  "messageSid": "MM229d178e63525ed16997d410e564be0d",
  "status": "queued",
  "to": "whatsapp:+33648662734",
  "leadId": "69272eee2a489f7a6",
  "leadName": "Jean Dupont",
  "templateUsed": "Confirmation RDV",
  "variablesMapped": {
    "prenom": "Jean",
    "date": "15/12/2025",
    "heure": "14h30"
  }
}
```

---

## 🚀 Avantages de cette architecture

### ✅ 1 seul outil universel
Pas besoin de créer un outil par template. L'outil `send_whatsapp_template` fonctionne avec **TOUS** les templates.

### ✅ Ajout de nouveaux templates = 0 code
Pour ajouter un nouveau template:
1. Créer le template sur Twilio (et l'approuver)
2. L'enregistrer dans MAX via l'API
3. C'est tout! M.A.X. peut l'utiliser immédiatement

### ✅ Mapping automatique intelligent
M.A.X. extrait automatiquement les variables depuis EspoCRM selon le contexte du lead.

### ✅ L'IA comprend le contexte
M.A.X. sait quel template utiliser selon votre demande:
- "Confirmation RDV" → pour les rendez-vous
- "Relance J+3" → pour le follow-up
- "Panier abandonné" → pour l'e-commerce

---

## 🔧 Configuration requise

### Variables d'environnement (.env)
```env
TWILIO_ACCOUNT_SID=AC78ebc7238576304ae00fbe4df3a07f5e
TWILIO_AUTH_TOKEN=12a0e364fb468ea4b00ab07f7e09f6fe
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Dépendances Node.js
```bash
npm install date-fns
```

---

## 📞 Support

Pour toute question sur le workflow WhatsApp avec M.A.X., contactez l'équipe technique.

**Twilio Console:** https://console.twilio.com/
**Docs Twilio WhatsApp:** https://www.twilio.com/docs/whatsapp
