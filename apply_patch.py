#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script pour appliquer le patch anti-hallucination à M.A.X.
Modifie le backend et le frontend pour ajouter toolStatus
"""

import re
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def patch_backend():
    """Modifie routes/chat.js pour ajouter toolStatus"""
    file_path = r'd:\Macrea\CRM\max_backend\routes\chat.js'

    print("Modification du backend...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rechercher le bloc res.json à remplacer
    old_pattern = r'''    // Retourner réponse M\.A\.X\. avec boutons contextuels automatiques
    res\.json\(\{
      ok: true,
      sessionId,
      response: finalText,
      answer: finalText, // Alias pour compatibilité
      actions,
      state: detectedState,
      tokens: result\.usage,
      messageCount: loadConversation\(sessionId\)\?\.messages\.length \|\| 0
    \}\);'''

    new_code = '''    // Déterminer le toolStatus basé sur l'exécution des tools
    let toolStatus = null;
    let executedTools = [];

    if (result.tool_calls && result.tool_calls.length > 0) {
      executedTools = result.tool_calls.map(tc => tc.function.name);

      // Identifier les tools d'action CRM critiques
      const actionTools = [
        'auto_enrich_missing_leads',
        'analyze_and_enrich_leads',
        'update_lead_fields',
        'update_leads_in_espo',
        'create_espo_lead',
        'batch_update_leads'
      ];

      const hasActionTool = executedTools.some(tool => actionTools.includes(tool));

      if (hasActionTool) {
        toolStatus = 'action_executed';
      } else {
        toolStatus = 'query_executed';
      }
    }

    // Retourner réponse M.A.X. avec boutons contextuels automatiques + toolStatus
    res.json({
      ok: true,
      sessionId,
      response: finalText,
      answer: finalText, // Alias pour compatibilité
      actions,
      state: detectedState,
      tokens: result.usage,
      messageCount: loadConversation(sessionId)?.messages.length || 0,
      toolStatus,           // 'action_executed', 'query_executed', ou null
      executedTools         // Liste des tools appelés
    });'''

    if re.search(old_pattern, content):
        content = re.sub(old_pattern, new_code, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("[OK] Backend modifie avec succes!")
        return True
    else:
        print("[WARN] Pattern non trouve dans le backend - peut-etre deja patche?")
        return False

def patch_frontend_interface():
    """Modifie l'interface Message dans ChatPage.tsx"""
    file_path = r'd:\Macrea\CRM\max_frontend\src\pages\ChatPage.tsx'

    print("Modification de l'interface Message...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rechercher l'interface Message
    old_interface = r'''interface Message \{
  id: string;
  role: 'user' \| 'assistant';
  content: string;
  timestamp: Date;
  tokens\?: number;
  attachments\?: Array<\{
    name: string;
    type: string;
    size: number;
    url\?: string;
  \}>;
  actions\?: Array<\{
    label: string;
    action: string;
    data\?: any;
  \}>;
\}'''

    new_interface = '''interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
  toolStatus?: 'action_executed' | 'query_executed' | null;
  executedTools?: string[];
}'''

    if re.search(old_interface, content):
        content = re.sub(old_interface, new_interface, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("[OK] Interface Message modifiee!")
        return True
    else:
        print("[WARN] Interface Message non trouvee ou deja modifiee")
        return False

def patch_frontend_handlesend():
    """Modifie handleSend pour capturer toolStatus"""
    file_path = r'd:\Macrea\CRM\max_frontend\src\pages\ChatPage.tsx'

    print("Modification de handleSend...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rechercher l'assignation assistantMessage
    old_assignment = r'''const assistantMessage: Message = \{
      id: \(Date\.now\(\) \+ 1\)\.toString\(\),
      role: 'assistant',
      content: data\.response,
      timestamp: new Date\(\),
      tokens: data\.tokens\?\.total_tokens,
      actions: data\.actions
    \};'''

    new_assignment = '''const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.response,
      timestamp: new Date(),
      tokens: data.tokens?.total_tokens,
      actions: data.actions,
      toolStatus: data.toolStatus,
      executedTools: data.executedTools
    };'''

    if re.search(old_assignment, content):
        content = re.sub(old_assignment, new_assignment, content)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("[OK] handleSend modifie!")
        return True
    else:
        print("[WARN] handleSend non trouve ou deja modifie")
        return False

def patch_frontend_indicator():
    """Remplace l'indicateur par mots-clés par toolStatus"""
    file_path = r'd:\Macrea\CRM\max_frontend\src\pages\ChatPage.tsx'

    print("Remplacement de l'indicateur 'Action en cours'...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Rechercher l'ancien indicateur basé sur mots-clés
    old_indicator = r'''\{/\* Action en cours - Afficher indicateur si dernier message contient des mots-clés d'action \*/\}
          \{!isTyping && messages\.length > 0 && \(\(\) => \{
            const lastMsg = messages\[messages\.length - 1\];
            if \(lastMsg\.role === 'assistant'\) \{
              const text = lastMsg\.content\.toLowerCase\(\);
              const actionKeywords = \['en cours', 'réfléchit', 'exécution', 'traitement', 'analyse', 'recherche', 'mise à jour', 'enrichissement'\];
              const hasActionKeyword = actionKeywords\.some\(kw => text\.includes\(kw\)\);

              if \(hasActionKeyword\) \{
                return \(
                  <div className="flex items-start gap-4 mt-2">
                    <div className="flex-shrink-0 w-10 h-10"></div>
                    <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                        <span className="text-xs text-cyan-300">Action en cours\.\.\.</span>
                      </div>
                    </div>
                  </div>
                \);
              \}
            \}
            return null;
          \}\)\(\)\}'''

    new_indicator = '''{/* Action en cours - Afficher SEULEMENT si toolStatus confirme une action réelle */}
          {!isTyping && messages.length > 0 && (() => {
            const lastMsg = messages[messages.length - 1];

            // Afficher "Action exécutée" SEULEMENT si un tool d'action a été exécuté
            if (lastMsg.role === 'assistant' && lastMsg.toolStatus === 'action_executed') {
              const toolsList = lastMsg.executedTools?.join(', ') || 'action CRM';

              return (
                <div className="flex items-start gap-4 mt-2">
                  <div className="flex-shrink-0 w-10 h-10"></div>
                  <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-xs text-green-300">✅ Action exécutée : {toolsList}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}'''

    if re.search(old_indicator, content, re.DOTALL):
        content = re.sub(old_indicator, new_indicator, content, flags=re.DOTALL)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("[OK] Indicateur remplace!")
        return True
    else:
        print("[WARN] Indicateur non trouve ou deja modifie")
        return False

if __name__ == '__main__':
    print("Application du patch anti-hallucination...\n")

    results = []

    # Backend
    results.append(("Backend (chat.js)", patch_backend()))

    # Frontend
    results.append(("Frontend - Interface", patch_frontend_interface()))
    results.append(("Frontend - handleSend", patch_frontend_handlesend()))
    results.append(("Frontend - Indicateur", patch_frontend_indicator()))

    print("\n" + "="*60)
    print("RESUME")
    print("="*60)

    for name, success in results:
        status = "[OK]" if success else "[WARN] Deja fait ou erreur"
        print(f"{name}: {status}")

    print("\nPatch termine! Redemarrez le backend et le frontend.")
