# Plan de Correction : Boutons Contextuels M.A.X.
## Rendre les actions dynamiques selon le contexte

---

## 🎯 Problème identifié

### Situation actuelle

```
┌────────────────────────────────────────────────────┐
│  M.A.X. : "✅ 10 leads importés dans EspoCRM !"    │
│                                                    │
│  💡 Prochaines étapes :                            │
│  • Enrichir les données manquantes                 │
│  • Créer des workflows de relance                  │
│                                                    │
│  [✅ Oui, importer]  ← Bouton obsolète !          │
│  [❌ Non, ne pas importer]  ← Inutile maintenant  │
│  [📥 Télécharger CSV]  ← Pas contextuel           │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Les boutons devraient être** :
```
[🔧 Enrichir maintenant]
[⚡ Créer workflows]
[📊 Voir dans le CRM]
```

---

## 📋 Architecture de la solution

### Flux complet

```
1. M.A.X. analyse la tâche et son contexte
   ↓
2. Backend détecte l'état actuel (import_done, analysis_ready, enrichment_proposed)
   ↓
3. Backend génère des boutons adaptés selon l'état
   ↓
4. Frontend affiche ces boutons dynamiques
   ↓
5. User clique sur un bouton
   ↓
6. Backend exécute l'action correspondante
   ↓
7. Nouveau contexte → Nouveaux boutons
```

---

## 🔧 ÉTAPE 1 : Backend — Logique contextuelle

### 1.1 Définir les états et leurs boutons

```python
# backend/action_mapper.py

from enum import Enum
from typing import List, Dict

class ConversationState(Enum):
    """États possibles de la conversation"""
    IDLE = "idle"  # Rien en cours
    FILE_UPLOADED = "file_uploaded"  # CSV uploadé, pas encore analysé
    ANALYSIS_READY = "analysis_ready"  # Analyse faite, en attente de confirmation
    IMPORT_DONE = "import_done"  # Import terminé
    ENRICHMENT_PROPOSED = "enrichment_proposed"  # Enrichissement suggéré
    WORKFLOW_PROPOSED = "workflow_proposed"  # Workflow suggéré
    ERROR = "error"  # Erreur survenue

class ActionButton:
    """Représente un bouton d'action"""
    def __init__(
        self,
        id: str,
        label: str,
        action: str,
        style: str = "primary",  # primary, secondary, success, warning
        icon: str = None
    ):
        self.id = id
        self.label = label
        self.action = action
        self.style = style
        self.icon = icon
    
    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "action": self.action,
            "style": self.style,
            "icon": self.icon
        }


class ActionMapper:
    """Génère les boutons selon le contexte"""
    
    @staticmethod
    def get_buttons_for_state(state: ConversationState, context: Dict = None) -> List[ActionButton]:
        """
        Retourne les boutons appropriés pour un état donné
        """
        
        if state == ConversationState.ANALYSIS_READY:
            return [
                ActionButton(
                    id="confirm_import",
                    label="✅ Oui, importer",
                    action="import_leads",
                    style="primary",
                    icon="upload"
                ),
                ActionButton(
                    id="cancel_import",
                    label="❌ Non, annuler",
                    action="cancel",
                    style="secondary",
                    icon="x"
                ),
                ActionButton(
                    id="download_csv",
                    label="📥 Télécharger CSV enrichi",
                    action="download_enriched_csv",
                    style="secondary",
                    icon="download"
                )
            ]
        
        elif state == ConversationState.IMPORT_DONE:
            lead_count = context.get('lead_count', 0) if context else 0
            
            return [
                ActionButton(
                    id="enrich_leads",
                    label="🔧 Enrichir les données",
                    action="start_enrichment",
                    style="primary",
                    icon="sparkles"
                ),
                ActionButton(
                    id="create_workflows",
                    label="⚡ Créer workflows",
                    action="setup_workflows",
                    style="primary",
                    icon="zap"
                ),
                ActionButton(
                    id="view_in_crm",
                    label="📊 Voir dans le CRM",
                    action="open_crm",
                    style="secondary",
                    icon="external-link"
                )
            ]
        
        elif state == ConversationState.ENRICHMENT_PROPOSED:
            enrichment_cost = context.get('enrichment_cost', 0) if context else 0
            enrichable_count = context.get('enrichable_count', 0) if context else 0
            
            return [
                ActionButton(
                    id="confirm_enrichment",
                    label=f"✅ Enrichir ({enrichable_count} leads, {enrichment_cost}€)",
                    action="execute_enrichment",
                    style="success",
                    icon="check"
                ),
                ActionButton(
                    id="skip_enrichment",
                    label="⏭️ Passer",
                    action="skip_enrichment",
                    style="secondary",
                    icon="skip-forward"
                ),
                ActionButton(
                    id="view_details",
                    label="📋 Voir détails",
                    action="show_enrichment_details",
                    style="secondary",
                    icon="info"
                )
            ]
        
        elif state == ConversationState.WORKFLOW_PROPOSED:
            workflow_name = context.get('workflow_name', '') if context else ''
            
            return [
                ActionButton(
                    id="activate_workflow",
                    label=f"🚀 Activer '{workflow_name}'",
                    action="activate_workflow",
                    style="success",
                    icon="play"
                ),
                ActionButton(
                    id="customize_workflow",
                    label="⚙️ Personnaliser",
                    action="customize_workflow",
                    style="primary",
                    icon="settings"
                ),
                ActionButton(
                    id="skip_workflow",
                    label="⏭️ Passer",
                    action="skip_workflow",
                    style="secondary",
                    icon="skip-forward"
                )
            ]
        
        elif state == ConversationState.ERROR:
            return [
                ActionButton(
                    id="retry",
                    label="🔄 Réessayer",
                    action="retry",
                    style="warning",
                    icon="refresh-cw"
                ),
                ActionButton(
                    id="cancel",
                    label="❌ Annuler",
                    action="cancel",
                    style="secondary",
                    icon="x"
                )
            ]
        
        else:  # IDLE ou autre
            return [
                ActionButton(
                    id="upload_file",
                    label="📤 Uploader des leads",
                    action="show_upload",
                    style="primary",
                    icon="upload"
                ),
                ActionButton(
                    id="analyze_crm",
                    label="🔍 Analyser mon CRM",
                    action="analyze_crm",
                    style="secondary",
                    icon="search"
                )
            ]
```

### 1.2 Détecter le contexte automatiquement

```python
# backend/context_detector.py

import re

class ContextDetector:
    """Détecte l'état de la conversation depuis le message M.A.X."""
    
    @staticmethod
    def detect_state(max_message: str, metadata: Dict = None) -> ConversationState:
        """
        Analyse le message de M.A.X. pour déterminer l'état actuel
        """
        message_lower = max_message.lower()
        
        # Import terminé
        if any(phrase in message_lower for phrase in [
            "leads importés",
            "import terminé",
            "✅ import",
            "créés dans espocrm"
        ]):
            return ConversationState.IMPORT_DONE
        
        # Enrichissement proposé
        if any(phrase in message_lower for phrase in [
            "enrichir",
            "enrichissement",
            "données manquantes",
            "compléter les champs"
        ]) and "?" in max_message:
            return ConversationState.ENRICHMENT_PROPOSED
        
        # Workflow proposé
        if any(phrase in message_lower for phrase in [
            "workflow",
            "automatisation",
            "relance automatique",
            "voulez-vous activer"
        ]) and "?" in max_message:
            return ConversationState.WORKFLOW_PROPOSED
        
        # Analyse prête pour import
        if any(phrase in message_lower for phrase in [
            "j'ai scanné",
            "j'ai analysé",
            "confirmer",
            "je lance"
        ]) and "?" in max_message:
            return ConversationState.ANALYSIS_READY
        
        # Erreur
        if any(phrase in message_lower for phrase in [
            "erreur",
            "impossible",
            "échec",
            "⚠️",
            "❌"
        ]):
            return ConversationState.ERROR
        
        # Par défaut
        return ConversationState.IDLE
    
    @staticmethod
    def extract_context_data(max_message: str) -> Dict:
        """
        Extrait les données contextuelles du message
        """
        context = {}
        
        # Extraire nombre de leads
        lead_match = re.search(r'(\d+)\s+leads?', max_message.lower())
        if lead_match:
            context['lead_count'] = int(lead_match.group(1))
        
        # Extraire coût enrichissement
        cost_match = re.search(r'(\d+(?:,\d+)?)\s*€', max_message)
        if cost_match:
            cost_str = cost_match.group(1).replace(',', '.')
            context['enrichment_cost'] = float(cost_str)
        
        # Extraire nom de workflow
        workflow_match = re.search(r'workflow[:\s]+"([^"]+)"', max_message.lower())
        if workflow_match:
            context['workflow_name'] = workflow_match.group(1)
        
        # Extraire nombre enrichissable
        enrichable_match = re.search(r'(\d+)\s+(?:leads?\s+)?(?:trouvables?|enrichissables?)', max_message.lower())
        if enrichable_match:
            context['enrichable_count'] = int(enrichable_match.group(1))
        
        return context
```

### 1.3 Modifier le handler de conversation

```python
# backend/max_conversation.py

from action_mapper import ActionMapper, ConversationState
from context_detector import ContextDetector

def handle_max_conversation(session_id: str, user_message: str, file_id: str = None):
    """
    Handler principal de conversation avec génération dynamique de boutons
    """
    
    # 1. Récupérer le contexte de session
    context = get_session_context(session_id)
    
    # 2. Préparer le message pour Claude
    messages = context.get('messages', [])
    
    if file_id:
        file_content = FileStorage.get_file_content(file_id)
        user_message += f"\n\n[Fichier CSV uploadé: {file_id}]\n{file_content}"
        context['current_file_id'] = file_id
    
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    # 3. Appeler Claude
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=2000,
        system=MAX_SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages
    )
    
    # 4. Traiter la réponse
    max_message = response.content[0].text
    
    messages.append({
        "role": "assistant",
        "content": max_message
    })
    
    # 5. Détecter l'état de la conversation
    detected_state = ContextDetector.detect_state(max_message)
    context_data = ContextDetector.extract_context_data(max_message)
    
    # 6. Générer les boutons appropriés
    action_buttons = ActionMapper.get_buttons_for_state(detected_state, context_data)
    
    # 7. Sauvegarder le contexte
    context['messages'] = messages
    context['current_state'] = detected_state.value
    context['context_data'] = context_data
    save_session_context(session_id, context)
    
    # 8. Retourner la réponse avec boutons dynamiques
    return {
        "message": max_message,
        "state": detected_state.value,
        "actions": [btn.to_dict() for btn in action_buttons],
        "context": context_data
    }
```

### 1.4 Créer les routes d'action

```python
# backend/action_handlers.py

@app.route("/api/max/action/<action_name>", methods=["POST"])
def execute_action(action_name):
    """
    Exécute une action déclenchée par un bouton
    """
    session_id = request.cookies.get('session_id')
    data = request.json
    
    context = get_session_context(session_id)
    
    # Router vers le bon handler
    handlers = {
        "import_leads": handle_import_leads,
        "start_enrichment": handle_start_enrichment,
        "execute_enrichment": handle_execute_enrichment,
        "skip_enrichment": handle_skip_enrichment,
        "setup_workflows": handle_setup_workflows,
        "activate_workflow": handle_activate_workflow,
        "open_crm": handle_open_crm,
        "download_enriched_csv": handle_download_csv,
        # ... autres actions
    }
    
    handler = handlers.get(action_name)
    
    if not handler:
        return jsonify({"error": f"Action inconnue: {action_name}"}), 400
    
    # Exécuter l'action
    result = handler(session_id, context, data)
    
    # Générer la réponse M.A.X. post-action
    max_response = generate_post_action_message(action_name, result)
    
    # Détecter le nouvel état
    new_state = ContextDetector.detect_state(max_response)
    new_context_data = ContextDetector.extract_context_data(max_response)
    
    # Générer les nouveaux boutons
    new_buttons = ActionMapper.get_buttons_for_state(new_state, new_context_data)
    
    return jsonify({
        "success": True,
        "message": max_response,
        "state": new_state.value,
        "actions": [btn.to_dict() for btn in new_buttons],
        "data": result
    })


# Handlers spécifiques

def handle_start_enrichment(session_id, context, data):
    """
    Démarre le processus d'enrichissement
    """
    file_id = context.get('current_file_id')
    leads = get_leads_from_file(file_id)
    
    # Analyser ce qui peut être enrichi
    enrichable = []
    for lead in leads:
        if not lead.get('company') or not lead.get('sector'):
            enrichable.append(lead)
    
    # Estimer le coût
    cost = len(enrichable) * 0.15  # 0.15€ par lead
    
    return {
        "enrichable_count": len(enrichable),
        "total_cost": cost,
        "leads": enrichable
    }


def handle_execute_enrichment(session_id, context, data):
    """
    Exécute l'enrichissement des leads
    """
    file_id = context.get('current_file_id')
    enrichment_data = context.get('context_data', {})
    
    # Enrichir via API externe
    enriched_leads = enrich_leads_via_api(file_id)
    
    # Mettre à jour dans EspoCRM
    updated_count = 0
    for lead in enriched_leads:
        if update_lead_in_espocrm(lead['id'], lead):
            updated_count += 1
    
    return {
        "updated_count": updated_count,
        "total_leads": len(enriched_leads)
    }


def handle_setup_workflows(session_id, context, data):
    """
    Configure les workflows automatiques
    """
    context_data = context.get('context_data', {})
    sector = context_data.get('sector', 'general')
    
    # Proposer des workflows adaptés au secteur
    available_workflows = get_workflows_for_sector(sector)
    
    return {
        "workflows": available_workflows,
        "sector": sector
    }


def handle_activate_workflow(session_id, context, data):
    """
    Active un workflow dans n8n
    """
    workflow_name = data.get('workflow_name')
    lead_ids = context.get('context_data', {}).get('lead_ids', [])
    
    # Déclencher le workflow n8n
    result = trigger_n8n_workflow(workflow_name, lead_ids)
    
    return {
        "workflow_activated": workflow_name,
        "lead_count": len(lead_ids),
        "n8n_execution_id": result.get('execution_id')
    }
```

---

## 🎨 ÉTAPE 2 : Frontend — Affichage dynamique

### 2.1 Composant boutons dynamiques

```typescript
// frontend/components/ActionButtons.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Upload, X, Download, Sparkles, Zap, 
  ExternalLink, Check, SkipForward, Info,
  Play, Settings, RefreshCw, Search
} from 'lucide-react';

interface ActionButton {
  id: string;
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'success' | 'warning';
  icon?: string;
}

interface ActionButtonsProps {
  actions: ActionButton[];
  onAction: (action: string) => void;
  loading?: boolean;
}

const ICON_MAP = {
  'upload': Upload,
  'x': X,
  'download': Download,
  'sparkles': Sparkles,
  'zap': Zap,
  'external-link': ExternalLink,
  'check': Check,
  'skip-forward': SkipForward,
  'info': Info,
  'play': Play,
  'settings': Settings,
  'refresh-cw': RefreshCw,
  'search': Search,
};

const STYLE_MAP = {
  'primary': 'bg-max-cyan hover:bg-max-cyan/90 text-white',
  'secondary': 'bg-max-dark-tertiary hover:bg-max-dark-elevated text-white',
  'success': 'bg-max-success hover:bg-max-success/90 text-white',
  'warning': 'bg-max-warning hover:bg-max-warning/90 text-white',
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  actions, 
  onAction, 
  loading = false 
}) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {actions.map((button) => {
        const Icon = button.icon ? ICON_MAP[button.icon] : null;
        const styleClass = STYLE_MAP[button.style] || STYLE_MAP['secondary'];

        return (
          <Button
            key={button.id}
            onClick={() => onAction(button.action)}
            disabled={loading}
            className={`${styleClass} transition-all duration-200 hover:scale-105`}
          >
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {button.label}
          </Button>
        );
      })}
    </div>
  );
};
```

### 2.2 Intégration dans le chat

```typescript
// frontend/components/ChatMessage.tsx

import React from 'react';
import { ActionButtons } from './ActionButtons';

interface ChatMessageProps {
  message: string;
  sender: 'user' | 'max';
  actions?: ActionButton[];
  onAction?: (action: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  sender,
  actions,
  onAction
}) => {
  const isMax = sender === 'max';

  return (
    <div className={`flex ${isMax ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] ${isMax ? 'bg-max-dark-secondary' : 'bg-max-cyan'} rounded-2xl p-4`}>
        {/* Avatar */}
        {isMax && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-max-gradient-primary rounded-full flex items-center justify-center font-bold text-white">
              M
            </div>
            <span className="font-semibold text-white">M.A.X.</span>
          </div>
        )}

        {/* Message content */}
        <div 
          className={`${isMax ? 'text-white' : 'text-max-dark-primary'} whitespace-pre-wrap`}
          dangerouslySetInnerHTML={{ __html: formatMessage(message) }}
        />

        {/* Action buttons (only for M.A.X. messages) */}
        {isMax && actions && actions.length > 0 && onAction && (
          <ActionButtons 
            actions={actions} 
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
};

function formatMessage(message: string): string {
  // Convertir markdown basique en HTML
  return message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}
```

### 2.3 Handler d'actions dans le chat

```typescript
// frontend/hooks/useChat.ts

import { useState } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'max';
  content: string;
  actions?: ActionButton[];
  timestamp: Date;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string, fileId?: string) => {
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    setLoading(true);

    try {
      // Appeler l'API
      const response = await fetch('/api/max/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          file_id: fileId
        })
      });

      const data = await response.json();

      // Ajouter la réponse de M.A.X. avec ses boutons
      const maxMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'max',
        content: data.message,
        actions: data.actions || [],  // ← Boutons dynamiques ici !
        timestamp: new Date()
      };
      setMessages(prev => [...prev, maxMessage]);

    } catch (error) {
      console.error('Erreur chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setLoading(true);

    try {
      // Exécuter l'action
      const response = await fetch(`/api/max/action/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      // Ajouter la réponse post-action avec nouveaux boutons
      const maxMessage: Message = {
        id: Date.now().toString(),
        sender: 'max',
        content: data.message,
        actions: data.actions || [],  // ← Nouveaux boutons selon le nouvel état
        timestamp: new Date()
      };
      setMessages(prev => [...prev, maxMessage]);

    } catch (error) {
      console.error('Erreur action:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    handleAction
  };
};
```

### 2.4 Composant Chat principal

```typescript
// frontend/pages/Chat.tsx

import React from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { useChat } from '@/hooks/useChat';

export const ChatPage = () => {
  const { messages, loading, sendMessage, handleAction } = useChat();
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-max-dark-primary">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg.content}
            sender={msg.sender}
            actions={msg.actions}
            onAction={handleAction}  // ← Gestion des clics sur boutons
          />
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-max-dark-tertiary p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Parlez à M.A.X..."
            className="flex-1 bg-max-dark-secondary border border-max-dark-tertiary rounded-lg px-4 py-2 text-white"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="btn-max"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## ✅ ÉTAPE 3 : Tests de validation

### 3.1 Scénario de test complet

```
TEST 1 : Import → Enrichissement
────────────────────────────────────────

1. User : [Upload CSV 10 leads]
   
   M.A.X. : "J'ai scanné 10 leads..."
   
   Boutons attendus :
   [✅ Oui, importer]
   [❌ Non, annuler]
   [📥 Télécharger CSV]
   
   ✅ PASS si ces 3 boutons s'affichent

2. User : Clique "✅ Oui, importer"
   
   Backend : Exécute import_leads()
   
   M.A.X. : "✅ 10 leads importés !"
   
   Boutons attendus :
   [🔧 Enrichir les données]
   [⚡ Créer workflows]
   [📊 Voir dans le CRM]
   
   ✅ PASS si les boutons ont changé
   ❌ FAIL si toujours les mêmes 3 boutons

3. User : Clique "🔧 Enrichir les données"
   
   Backend : Exécute start_enrichment()
   
   M.A.X. : "Je peux enrichir 8 leads (coût : 1,20€). Confirmer ?"
   
   Boutons attendus :
   [✅ Enrichir (8 leads, 1.20€)]
   [⏭️ Passer]
   [📋 Voir détails]
   
   ✅ PASS si nouveaux boutons contextuels

4. User : Clique "✅ Enrichir"
   
   Backend : Exécute execute_enrichment()
   
   M.A.X. : "✅ 8 leads enrichis !"
   
   Boutons attendus :
   [⚡ Créer workflows]
   [📊 Voir dans le CRM]
   
   ✅ PASS si boutons adaptés au nouvel état
```

### 3.2 Script de test automatisé

```python
# tests/test_contextual_buttons.py

import pytest
from backend.action_mapper import ActionMapper, ConversationState
from backend.context_detector import ContextDetector

def test_analysis_ready_buttons():
    """Test : Boutons après analyse CSV"""
    state = ConversationState.ANALYSIS_READY
    buttons = ActionMapper.get_buttons_for_state(state)
    
    assert len(buttons) == 3
    assert buttons[0].action == "import_leads"
    assert buttons[1].action == "cancel"
    assert buttons[2].action == "download_enriched_csv"

def test_import_done_buttons():
    """Test : Boutons après import réussi"""
    state = ConversationState.IMPORT_DONE
    context = {"lead_count": 10}
    buttons = ActionMapper.get_buttons_for_state(state, context)
    
    assert len(buttons) == 3
    assert buttons[0].action == "start_enrichment"
    assert buttons[1].action == "setup_workflows"
    assert buttons[2].action == "open_crm"

def test_enrichment_proposed_buttons():
    """Test : Boutons après proposition enrichissement"""
    state = ConversationState.ENRICHMENT_PROPOSED
    context = {
        "enrichable_count": 8,
        "enrichment_cost": 1.20
    }
    buttons = ActionMapper.get_buttons_for_state(state, context)
    
    assert len(buttons) == 3
    assert buttons[0].action == "execute_enrichment"
    assert "8 leads" in buttons[0].label
    assert "1.2€" in buttons[0].label or "1,2€" in buttons[0].label

def test_context_detection():
    """Test : Détection automatique du contexte"""
    
    # Test import terminé
    message1 = "✅ 10 leads importés dans EspoCRM !"
    state1 = ContextDetector.detect_state(message1)
    assert state1 == ConversationState.IMPORT_DONE
    
    # Test enrichissement proposé
    message2 = "Je peux enrichir 8 leads. Voulez-vous continuer ?"
    state2 = ContextDetector.detect_state(message2)
    assert state2 == ConversationState.ENRICHMENT_PROPOSED
    
    # Test workflow proposé
    message3 = "Workflow 'Relance J+3' disponible. Activer ?"
    state3 = ContextDetector.detect_state(message3)
    assert state3 == ConversationState.WORKFLOW_PROPOSED

def test_context_data_extraction():
    """Test : Extraction des données contextuelles"""
    message = """
    ✅ 10 leads importés !
    
    Je peux enrichir 8 leads (coût : 1,20€).
    Workflow "Relance J+3" recommandé.
    """
    
    context = ContextDetector.extract_context_data(message)
    
    assert context['lead_count'] == 10
    assert context['enrichable_count'] == 8
    assert context['enrichment_cost'] == 1.20
    assert context['workflow_name'] == "Relance J+3"

# Lancer les tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### 3.3 Test manuel dans le navigateur

```javascript
// tests/manual_test.js

// Ouvrir la console du navigateur et exécuter :

// Test 1 : Uploader un CSV
const formData = new FormData();
formData.append('file', document.querySelector('input[type="file"]').files[0]);

fetch('/api/upload', { method: 'POST', body: formData })
  .then(r => r.json())
  .then(data => {
    console.log('File ID:', data.file_id);
    
    // Test 2 : Demander analyse
    return fetch('/api/max/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        message: `Analyse le fichier ${data.file_id}`,
        file_id: data.file_id
      })
    });
  })
  .then(r => r.json())
  .then(data => {
    console.log('M.A.X. Response:', data.message);
    console.log('Actions disponibles:', data.actions);
    
    // Vérifier que les boutons sont bien [Importer, Annuler, Télécharger]
    console.assert(data.actions.length === 3, 'Devrait avoir 3 boutons');
    console.assert(data.actions[0].action === 'import_leads', 'Premier bouton devrait être import');
    
    // Test 3 : Cliquer "Importer"
    return fetch('/api/max/action/import_leads', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    });
  })
  .then(r => r.json())
  .then(data => {
    console.log('Post-import Response:', data.message);
    console.log('Nouveaux boutons:', data.actions);
    
    // Vérifier que les boutons ont changé
    console.assert(data.actions[0].action === 'start_enrichment', 'Devrait proposer enrichissement');
    console.assert(data.actions[1].action === 'setup_workflows', 'Devrait proposer workflows');
    
    console.log('✅ Test réussi ! Les boutons sont contextuels.');
  });
```

---

## 📊 Tableau récapitulatif

| État | Boutons affichés | Action déclenchée |
|------|------------------|-------------------|
| **ANALYSIS_READY** | ✅ Importer<br>❌ Annuler<br>📥 Télécharger | `import_leads`<br>`cancel`<br>`download_csv` |
| **IMPORT_DONE** | 🔧 Enrichir<br>⚡ Workflows<br>📊 Voir CRM | `start_enrichment`<br>`setup_workflows`<br>`open_crm` |
| **ENRICHMENT_PROPOSED** | ✅ Enrichir (X leads, Y€)<br>⏭️ Passer<br>📋 Détails | `execute_enrichment`<br>`skip_enrichment`<br>`show_details` |
| **WORKFLOW_PROPOSED** | 🚀 Activer workflow<br>⚙️ Personnaliser<br>⏭️ Passer | `activate_workflow`<br>`customize_workflow`<br>`skip_workflow` |
| **ERROR** | 🔄 Réessayer<br>❌ Annuler | `retry`<br>`cancel` |

---

## 🎯 Checklist finale

### Backend
- [ ] `action_mapper.py` créé avec tous les états
- [ ] `context_detector.py` implémenté
- [ ] `handle_max_conversation()` modifié pour générer boutons dynamiques
- [ ] Routes `/api/max/action/<action_name>` créées
- [ ] Handlers d'actions implémentés (enrichment, workflows, etc.)
- [ ] Tests unitaires passent (pytest)

### Frontend
- [ ] Composant `ActionButtons.tsx` créé
- [ ] `ChatMessage.tsx` modifié pour afficher les boutons
- [ ] Hook `useChat.ts` avec `handleAction()`
- [ ] Page `Chat.tsx` intégrée
- [ ] Tests manuels réussis (console browser)

### Validation
- [ ] Import → Boutons changent en "Enrichir/Workflows/CRM"
- [ ] Enrichir → Boutons changent en "Confirmer/Passer/Détails"
- [ ] Workflow → Boutons changent en "Activer/Personnaliser/Passer"
- [ ] Aucune régression sur l'import existant
- [ ] Performance OK (<500ms changement de boutons)

---

## 🚀 Déploiement

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
python tests/test_contextual_buttons.py  # Tous verts
flask run

# 2. Frontend
cd frontend
npm install
npm run build
npm run preview

# 3. Test end-to-end
# Suivre le scénario de test complet (Étape 3.1)
```

---

**Version** : 1.0  
**Date** : 2025-11-07  
**Auteure** : Malala — MaCréa Studio AI

© 2025 MaCréa Studio AI
