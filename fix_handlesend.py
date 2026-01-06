# -*- coding: utf-8 -*-
import re

file_path = r'd:\Macrea\CRM\max_frontend\src\pages\ChatPage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer les deux occurrences de assistantMessage
old1 = '''      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        tokens: data.tokens?.total_tokens,
        actions: data.actions
      };'''

new1 = '''      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        tokens: data.tokens?.total_tokens,
        actions: data.actions,
        toolStatus: data.toolStatus,
        executedTools: data.executedTools
      };'''

if old1 in content:
    content = content.replace(old1, new1)
    print("[OK] Premiere occurrence modifiee")
else:
    print("[SKIP] Premiere occurrence deja modifiee")

# Deuxième occurrence (handleFileUpload)
old2 = '''      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        actions: data.actions
      };'''

new2 = '''      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        actions: data.actions,
        toolStatus: data.toolStatus,
        executedTools: data.executedTools
      };'''

if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Deuxieme occurrence modifiee")
else:
    print("[SKIP] Deuxieme occurrence deja modifiee")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFix termine!")
