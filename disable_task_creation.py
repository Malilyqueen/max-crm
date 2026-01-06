# -*- coding: utf-8 -*-
"""
Désactiver temporairement la création automatique de tasks qui ralentit l'enrichissement
"""

file_path = r'd:\Macrea\CRM\max_backend\routes\chat.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Commenter le bloc de création de tâches (lignes 973-1025)
old_code = '''            // Créer une tâche stratégique basée sur l'urgence
            if (leadDetail) {'''

new_code = '''            // Créer une tâche stratégique basée sur l'urgence (DÉSACTIVÉ TEMPORAIREMENT - trop lent + erreur dateEnd)
            if (false && leadDetail) {'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("[OK] Création de tasks désactivée - enrichissement sera BEAUCOUP plus rapide!")
else:
    print("[SKIP] Déjà modifié")
