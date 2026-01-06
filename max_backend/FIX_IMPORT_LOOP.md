# Résolution : M.A.X. bloqué en boucle d'analyse
## Problème technique + Solutions

---

## 🔴 Diagnostic du problème

### Symptôme observé

```
Utilisateur : "Importe dans le CRM"
M.A.X. : "Envoyez le fichier"
Utilisateur : [Upload CSV]
M.A.X. : [Analyse] "Confirmez pour lancement ?"
Utilisateur : "Oui"
M.A.X. : "Envoyez le fichier à nouveau"  ← BOUCLE INFINIE
```

### Cause racine

M.A.X. (Claude API) **n'a PAS d'outil pour interagir avec l'API EspoCRM**.

```
┌──────────────────────────────────────────┐
│  M.A.X. (Claude API)                     │
│                                          │
│  ✅ Peut : Analyser le CSV               │
│  ✅ Peut : Détecter patterns             │
│  ✅ Peut : Suggérer actions              │
│                                          │
│  ❌ Ne peut PAS : Créer leads dans CRM   │
│  ❌ Ne peut PAS : Appeler API EspoCRM    │
│  ❌ Ne peut PAS : Exécuter l'import      │
│                                          │
└──────────────────────────────────────────┘
```

**Résultat** : M.A.X. reste bloqué en mode "analyse" sans jamais passer à l'action.

---

## ✅ Solution 1 : Function Calling (Recommandé)

### Principe

Donner à M.A.X. un outil `import_leads_to_crm` qu'il peut appeler.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  User : [Upload CSV]                                │
│    ↓                                                 │
│  M.A.X. (Claude API)                                │
│    ↓ [Analyse CSV]                                  │
│    ↓ [Détecte : 10 leads, secteur cosmétique]       │
│    ↓                                                 │
│  M.A.X. appelle : import_leads_to_crm()             │
│    ↓                                                 │
│  Votre serveur backend                              │
│    ↓ [Parse CSV]                                    │
│    ↓ [Appelle API EspoCRM]                          │
│    ↓ POST /api/v1/Lead (x10)                        │
│    ↓                                                 │
│  EspoCRM                                            │
│    ↓ [Crée 10 leads]                                │
│    ↓ [Retourne IDs]                                 │
│    ↓                                                 │
│  M.A.X. reçoit confirmation                         │
│    ↓                                                 │
│  User : "✅ 10 leads importés"                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Implémentation

#### 1. Définir la function pour Claude

```python
# tools/import_crm.py

import anthropic

tools = [
    {
        "name": "import_leads_to_crm",
        "description": """
        Importe des leads dans EspoCRM après analyse.
        À utiliser après avoir analysé un CSV uploadé par l'utilisateur.
        """,
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Chemin du fichier CSV analysé"
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags à appliquer (ex: ['Import-Nov2025', 'Cosmétique'])"
                },
                "enrichment": {
                    "type": "boolean",
                    "description": "Lancer l'enrichissement automatique après import"
                },
                "workflow": {
                    "type": "string",
                    "description": "Workflow à déclencher (ex: 'relance-j3', 'demo-j1')",
                    "enum": ["none", "relance-j3", "demo-j1", "nurturing"]
                }
            },
            "required": ["file_path", "tags"]
        }
    }
]

# Configuration Claude avec tools
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=2000,
    tools=tools,
    system=MAX_SYSTEM_PROMPT,
    messages=messages
)
```

#### 2. Implémenter la fonction backend

```python
# backend/import_handler.py

import csv
import requests
from typing import List, Dict

ESPOCRM_API_URL = "https://votre-crm.com/api/v1"
ESPOCRM_API_KEY = os.environ["ESPOCRM_API_KEY"]

def import_leads_to_crm(
    file_path: str,
    tags: List[str],
    enrichment: bool = False,
    workflow: str = "none"
) -> Dict:
    """
    Importe les leads depuis CSV vers EspoCRM
    """
    
    # 1. Parser le CSV
    leads_data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads_data.append(row)
    
    # 2. Créer les leads dans EspoCRM
    created_leads = []
    errors = []
    
    for lead in leads_data:
        payload = {
            "firstName": lead.get("Prénom", ""),
            "lastName": lead.get("Nom", ""),
            "emailAddress": lead.get("Email", ""),
            "phoneNumber": lead.get("Téléphone", ""),
            "accountName": lead.get("Entreprise", ""),
            "status": "New",
            "source": "Import CSV",
            "description": lead.get("Description", ""),
            # Tags
            "tags": tags,
            # Custom fields
            "region": lead.get("Région", ""),
            "sector": lead.get("Secteur", "")
        }
        
        try:
            response = requests.post(
                f"{ESPOCRM_API_URL}/Lead",
                headers={
                    "X-Api-Key": ESPOCRM_API_KEY,
                    "Content-Type": "application/json"
                },
                json=payload
            )
            response.raise_for_status()
            
            lead_id = response.json()["id"]
            created_leads.append(lead_id)
            
        except Exception as e:
            errors.append({
                "lead": f"{lead.get('Prénom')} {lead.get('Nom')}",
                "error": str(e)
            })
    
    # 3. Enrichissement (si demandé)
    if enrichment and created_leads:
        enrich_leads(created_leads)
    
    # 4. Déclencher workflow (si spécifié)
    if workflow != "none" and created_leads:
        trigger_workflow(workflow, created_leads)
    
    # 5. Retourner résumé
    return {
        "success": True,
        "total_leads": len(leads_data),
        "imported": len(created_leads),
        "errors": len(errors),
        "lead_ids": created_leads,
        "error_details": errors if errors else None
    }


def enrich_leads(lead_ids: List[str]):
    """
    Enrichit les leads via APIs externes
    """
    for lead_id in lead_ids:
        # Récupérer le lead
        lead = requests.get(
            f"{ESPOCRM_API_URL}/Lead/{lead_id}",
            headers={"X-Api-Key": ESPOCRM_API_KEY}
        ).json()
        
        email = lead.get("emailAddress")
        if not email:
            continue
        
        # Enrichir via Clearbit/Hunter
        enriched_data = call_enrichment_api(email)
        
        # Mettre à jour le lead
        requests.put(
            f"{ESPOCRM_API_URL}/Lead/{lead_id}",
            headers={"X-Api-Key": ESPOCRM_API_KEY},
            json=enriched_data
        )


def trigger_workflow(workflow_name: str, lead_ids: List[str]):
    """
    Déclenche un workflow n8n pour les leads importés
    """
    requests.post(
        f"https://n8n.votre-domaine.com/webhook/{workflow_name}",
        json={"lead_ids": lead_ids}
    )
```

#### 3. Gérer l'appel de fonction dans votre app

```python
# main.py

def handle_max_conversation(user_message: str, uploaded_file=None):
    """
    Gère la conversation avec M.A.X. + function calling
    """
    
    # Préparer le contexte
    messages = [
        {"role": "user", "content": user_message}
    ]
    
    # Si fichier uploadé, l'ajouter au contexte
    if uploaded_file:
        file_content = uploaded_file.read().decode('utf-8')
        messages[0]["content"] += f"\n\n[Fichier CSV uploadé]\n{file_content}"
    
    # Appeler Claude avec tools
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2000,
        tools=tools,
        system=MAX_SYSTEM_PROMPT,
        messages=messages
    )
    
    # Vérifier si Claude veut appeler une fonction
    if response.stop_reason == "tool_use":
        for content in response.content:
            if content.type == "tool_use":
                tool_name = content.name
                tool_input = content.input
                
                # Exécuter la fonction
                if tool_name == "import_leads_to_crm":
                    result = import_leads_to_crm(**tool_input)
                    
                    # Retourner le résultat à Claude
                    messages.append({
                        "role": "assistant",
                        "content": response.content
                    })
                    messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": content.id,
                            "content": json.dumps(result)
                        }]
                    })
                    
                    # Claude génère la réponse finale
                    final_response = client.messages.create(
                        model="claude-sonnet-4-5-20250929",
                        max_tokens=2000,
                        tools=tools,
                        system=MAX_SYSTEM_PROMPT,
                        messages=messages
                    )
                    
                    return final_response.content[0].text
    
    # Réponse normale (pas de function call)
    return response.content[0].text
```

#### 4. Conversation avec function calling

```
[User uploade CSV]

M.A.X. (analyse) :
J'ai scanné 10 leads cosmétiques.

Patterns détectés :
• Secteur : Cosmétiques (90% confiance)
• Complétude : Excellente (100% sauf région)
• Nouveaux leads : 2 (Amina, Nadia) → Priorité

Actions :
1. Import avec tag [Cosmétique-Nov2025]
2. Workflow relance J+3 pour les 2 nouveaux
3. Enrichissement région via code postal

[M.A.X. appelle automatiquement import_leads_to_crm()]

[Backend exécute l'import → 10 leads créés dans EspoCRM]

[M.A.X. reçoit confirmation]

M.A.X. (réponse finale) :
✅ Import terminé !

Résultats :
• 10 leads créés dans EspoCRM
• Tags appliqués : [Cosmétique-Nov2025] [Import]
• Workflow "Relance J+3" activé pour Amina & Nadia
• IDs leads : Lead-00234 à Lead-00243

Prochaines étapes suggérées :
→ Enrichir région manquante (2 leads, 0€)
→ Vérifier email Fatima (doublon potentiel)

Dashboard mis à jour : 10 nouveaux leads visibles.
```

**Plus de boucle infinie** ! ✅

---

## ✅ Solution 2 : Workflow n8n automatique (Alternative)

### Principe

Déclencher automatiquement un workflow n8n quand M.A.X. confirme l'analyse.

### Architecture

```
1. User uploade CSV
   ↓
2. M.A.X. analyse + sauvegarde CSV temporaire
   ↓
3. M.A.X. envoie webhook n8n
   ↓
4. n8n récupère CSV → Parse → Import EspoCRM
   ↓
5. n8n notifie M.A.X. (via callback)
   ↓
6. M.A.X. confirme à l'utilisateur
```

### Workflow n8n

```json
{
  "name": "Import CSV to EspoCRM",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "import-csv",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Download CSV",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$json.file_url}}",
        "method": "GET"
      }
    },
    {
      "name": "Parse CSV",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": {
        "batchSize": 1,
        "options": {}
      }
    },
    {
      "name": "Create Lead in EspoCRM",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://crm.domain.com/api/v1/Lead",
        "method": "POST",
        "authentication": "genericCredentialType",
        "body": {
          "firstName": "={{$json.Prénom}}",
          "lastName": "={{$json.Nom}}",
          "emailAddress": "={{$json.Email}}",
          "phoneNumber": "={{$json.Téléphone}}",
          "tags": "={{$json.tags}}"
        }
      }
    },
    {
      "name": "Notify M.A.X.",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://votre-app.com/api/max/import-complete",
        "method": "POST",
        "body": {
          "success": true,
          "imported": "={{$json.count}}"
        }
      }
    }
  ]
}
```

### Code M.A.X. (trigger n8n)

```python
# Après analyse CSV

def trigger_import_workflow(csv_path, tags, workflow="relance-j3"):
    """
    Déclenche le workflow n8n d'import
    """
    
    # Upload CSV sur serveur temporaire
    file_url = upload_to_temp_storage(csv_path)
    
    # Appeler webhook n8n
    response = requests.post(
        "https://n8n.domain.com/webhook/import-csv",
        json={
            "file_url": file_url,
            "tags": tags,
            "workflow": workflow,
            "callback_url": "https://votre-app.com/api/max/import-complete"
        }
    )
    
    return response.json()


# Dans la conversation M.A.X.
if user_confirms_import:
    result = trigger_import_workflow(
        csv_path="/tmp/uploaded.csv",
        tags=["Cosmétique-Nov2025", "Import"],
        workflow="relance-j3"
    )
    
    # M.A.X. attend la callback
    # (implémentation avec polling ou webhook)
```

---

## ✅ Solution 3 : Import synchrone direct (Simple)

### Principe

M.A.X. dit "J'importe" et votre backend fait l'import immédiatement (pas de function calling).

### Code

```python
# backend/routes.py

@app.route("/api/max/import-csv", methods=["POST"])
def import_csv_endpoint():
    """
    Endpoint appelé par le frontend quand user dit "Oui, importe"
    """
    
    file = request.files.get('csv')
    tags = request.json.get('tags', [])
    enrichment = request.json.get('enrichment', False)
    
    # Sauvegarder temporairement
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)
    
    # Importer
    result = import_leads_to_crm(
        file_path=temp_path,
        tags=tags,
        enrichment=enrichment
    )
    
    return jsonify(result)


# Frontend (quand user dit "Oui")

async function confirmImport() {
    const formData = new FormData();
    formData.append('csv', uploadedFile);
    formData.append('tags', JSON.stringify(['Cosmétique-Nov2025']));
    formData.append('enrichment', true);
    
    const response = await fetch('/api/max/import-csv', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    // Afficher dans le chat M.A.X.
    addMessageToChat({
        sender: 'max',
        text: `✅ Import terminé !\n\n${result.imported} leads créés.\nTags appliqués : ${result.tags.join(', ')}`
    });
}
```

**Avantage** : Plus simple, pas de function calling  
**Inconvénient** : M.A.X. ne contrôle pas directement l'import

---

## 🎯 Comparaison des solutions

| Solution | Complexité | Contrôle M.A.X. | Temps implémentation |
|----------|------------|-----------------|----------------------|
| **Function Calling** | Moyenne | ✅ Total | 2-3 jours |
| **Workflow n8n** | Élevée | ⚠️ Partiel | 3-5 jours |
| **Import synchrone** | Faible | ❌ Minimal | 1 jour |

### Recommandation

**Solution 1 (Function Calling)** pour :
- M.A.X. vraiment autonome
- Expérience utilisateur fluide
- Scalabilité

---

## 📋 Checklist implémentation

### Pour Function Calling

- [ ] Définir tool `import_leads_to_crm` dans Claude API
- [ ] Implémenter fonction backend `import_leads_to_crm()`
- [ ] Gérer les tool_use responses dans votre app
- [ ] Tester avec 1 lead puis 10 puis 100
- [ ] Ajouter gestion d'erreurs (email invalide, doublon)
- [ ] Implémenter enrichissement optionnel
- [ ] Connecter workflows n8n post-import
- [ ] Logger toutes les actions pour audit

### Messages d'erreur à gérer

```python
ERROR_MESSAGES = {
    "api_down": "❌ EspoCRM indisponible. Réessayer dans 5 min ?",
    "duplicate": "⚠️ 3 doublons détectés. Fusionner ou ignorer ?",
    "invalid_email": "❌ 2 emails invalides. Corriger ou importer sans eux ?",
    "quota_exceeded": "⚠️ Quota API atteint (500/jour). Reprendre demain ?",
    "permission_denied": "❌ M.A.X. n'a pas les droits. Contacter admin."
}
```

---

## 🚀 Test final

### Scénario de test complet

```
1. User : "Importe ces leads dans le CRM"
2. User : [Upload prospects.csv]
3. M.A.X. : [Analyse] "10 leads détectés. Tags : [Cosmétique-Nov2025]. Confirmer ?"
4. User : "Oui"
5. M.A.X. : [Appelle import_leads_to_crm()]
6. Backend : [Parse CSV] [POST /api/v1/Lead x10] [Success]
7. M.A.X. : "✅ 10 leads importés. IDs : Lead-00234 à Lead-00243"
8. User : Voit les leads dans EspoCRM immédiatement
```

**Pas de boucle. Pas de re-demande de fichier.** ✅

---

## 📞 Support

Si problème persiste après implémentation :
- Vérifier logs Claude API (tool_use détecté ?)
- Vérifier logs backend (fonction appelée ?)
- Vérifier logs EspoCRM (leads créés ?)

**Debug tip** : Ajouter `print()` à chaque étape pour tracer le flux.

---

**Version** : 1.0  
**Date** : 2025-11-07  
**Auteure** : Malala — MaCréa Studio AI

© 2025 MaCréa Studio AI
