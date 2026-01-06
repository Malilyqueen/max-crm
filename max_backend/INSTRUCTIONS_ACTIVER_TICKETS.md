# Instructions : Activer l'entité Tickets dans EspoCRM

## Problème Identifié

L'action `create_ticket` échoue avec **403 Forbidden** car l'entité **Case** (Tickets) est **désactivée** dans EspoCRM.

## Solution

### Étape 1 : Activer l'entité Case

1. Connecte-toi à EspoCRM en tant qu'administrateur
2. Va dans **Administration** (en haut à droite)
3. Clique sur **Entity Manager** dans le panneau de gauche
4. Cherche **"Case"** dans la liste des entités
5. Clique sur **Case**
6. Vérifie que le statut est sur **"Enabled"** (activé)
   - Si c'est sur "Disabled", active-le
7. **Save**

### Étape 2 : Vérifier les permissions

Une fois l'entité activée, vérifie que le rôle AdminMax a toujours les permissions :

1. **Administration > Roles > AdminMax**
2. Trouve **Case** dans la liste
3. Vérifie :
   - **Create** : yes
   - **Read** : yes
   - **Edit** : yes
   - **Delete** : yes (optionnel)
4. **Save**

### Étape 3 : Tester

Relance le test pour vérifier que les 4 actions fonctionnent :

```bash
node "d:\Macrea\CRM\max_backend\test-new-entities.js"
```

Résultat attendu :
```
✅ TEST A (create_opportunity): SUCCESS
✅ TEST B (create_contact): SUCCESS
✅ TEST C (create_ticket): SUCCESS  ← Devrait maintenant fonctionner
✅ TEST D (create_knowledge_article): SUCCESS
```

## Pourquoi l'entité était désactivée ?

Dans EspoCRM, certaines entités optionnelles (comme Case/Tickets) peuvent être désactivées par défaut pour alléger l'interface si elles ne sont pas utilisées. Une fois activées, elles apparaissent dans les menus et sont accessibles via l'API.

---

**Note** : Après activation, il peut être nécessaire de :
- Clear le cache EspoCRM (Administration > Clear Cache)
- Rebuild EspoCRM (Administration > Rebuild)