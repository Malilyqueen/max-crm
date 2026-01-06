# -*- coding: utf-8 -*-
"""
Fix: Corriger les noms de champs secteur → secteurInfere et maxTags → tagsIA
"""

file_path = r'd:\Macrea\CRM\max_backend\routes\chat.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer les 2 occurrences
old_code = '''            await espoFetch(`/Lead/${lead.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                secteur: lead.secteur,
                maxTags: lead.maxTags,
                description: lead.description
              })
            });'''

new_code = '''            await espoFetch(`/Lead/${lead.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                secteurInfere: lead.secteur,
                tagsIA: lead.maxTags,
                description: lead.description
              })
            });'''

count = content.count(old_code)
print(f"Trouvé {count} occurrences à remplacer")

if count > 0:
    content = content.replace(old_code, new_code)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] {count} occurrences corrigées!")
else:
    print("[SKIP] Déjà corrigé ou code différent")
