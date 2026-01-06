<?php
/**
 * Script pour modifier les layouts EspoCRM via l'API interne
 * Utilisé par M.A.X. pour automatiser la configuration des entités
 */

// Charger l'application EspoCRM
require_once __DIR__ . '/../bootstrap.php';

$app = new \Espo\Core\Application();
$container = $app->getContainer();

// Services nécessaires
$entityManager = $container->get('entityManager');
$metadata = $container->get('metadata');
$dataManager = $container->get('dataManager');
$layoutManager = $container->get('layoutManager');

// Configuration
$entityType = $argv[1] ?? 'Lead';
$operation = $argv[2] ?? 'add_fields'; // add_fields, modify_layout, rebuild

echo "=== Modification Layouts EspoCRM ===\n";
echo "Entité: $entityType\n";
echo "Opération: $operation\n\n";

try {
    switch ($operation) {
        case 'add_fields':
            // Créer les champs personnalisés
            $fields = [
                'maxTags' => [
                    'type' => 'multiEnum',
                    'label' => 'Tags',
                    'options' => ['VIP', 'Prioritaire', 'Urgent', 'Suivi'],
                    'isCustom' => true
                ],
                'objectifsBusiness' => [
                    'type' => 'text',
                    'label' => 'Objectifs Business',
                    'isCustom' => true
                ],
                'servicesSouhaites' => [
                    'type' => 'text',
                    'label' => 'Services Souhaités',
                    'isCustom' => true
                ],
                'statutActions' => [
                    'type' => 'varchar',
                    'label' => 'Statut des Actions',
                    'maxLength' => 255,
                    'isCustom' => true
                ],
                'prochainesEtapes' => [
                    'type' => 'text',
                    'label' => 'Prochaines Étapes',
                    'isCustom' => true
                ]
            ];

            foreach ($fields as $fieldName => $fieldDef) {
                // Vérifier si le champ existe déjà
                $existingFieldDefs = $metadata->get(['entityDefs', $entityType, 'fields', $fieldName]);

                if (!$existingFieldDefs) {
                    echo "Création du champ: $fieldName\n";

                    // Créer le champ via l'API interne
                    $metadata->set('entityDefs', $entityType, [
                        'fields' => [
                            $fieldName => $fieldDef
                        ]
                    ]);
                } else {
                    echo "Champ déjà existant: $fieldName\n";
                }
            }

            // Sauvegarder les métadonnées
            $metadata->save();
            echo "\n✅ Champs créés avec succès\n";
            break;

        case 'modify_layout':
            // Modifier le layout Detail
            $detailLayout = $layoutManager->get($entityType, 'detail');

            if (!$detailLayout) {
                $detailLayout = [
                    [
                        'rows' => []
                    ]
                ];
            }

            // Ajouter les nouveaux champs dans la première panel
            $newFields = [
                ['name' => 'maxTags'],
                ['name' => 'objectifsBusiness'],
                ['name' => 'servicesSouhaites'],
                ['name' => 'statutActions'],
                ['name' => 'prochainesEtapes']
            ];

            // Ajouter à la fin du premier panel
            if (!isset($detailLayout[0]['rows'])) {
                $detailLayout[0]['rows'] = [];
            }

            foreach ($newFields as $field) {
                $detailLayout[0]['rows'][] = [
                    [
                        'name' => $field['name'],
                        'fullWidth' => true
                    ],
                    false
                ];
            }

            $layoutManager->set($detailLayout, $entityType, 'detail');
            echo "✅ Layout Detail modifié\n";

            // Modifier le layout List
            $listLayout = $layoutManager->get($entityType, 'list');

            if (!$listLayout) {
                $listLayout = [];
            }

            // Ajouter Tags et Statut Actions
            $listLayout[] = ['name' => 'maxTags', 'width' => 10];
            $listLayout[] = ['name' => 'statutActions', 'width' => 15];

            $layoutManager->set($listLayout, $entityType, 'list');
            echo "✅ Layout List modifié\n";

            break;

        case 'rebuild':
            echo "Exécution du rebuild...\n";
            $dataManager->rebuild();
            echo "✅ Rebuild terminé\n";
            break;

        case 'full':
            // Tout faire d'un coup
            echo "=== Opération complète ===\n\n";

            // 1. Créer les champs
            echo "Étape 1/3: Création des champs\n";
            exec("php " . __FILE__ . " $entityType add_fields");

            // 2. Modifier les layouts
            echo "\nÉtape 2/3: Modification des layouts\n";
            exec("php " . __FILE__ . " $entityType modify_layout");

            // 3. Rebuild
            echo "\nÉtape 3/3: Rebuild\n";
            exec("php " . __FILE__ . " $entityType rebuild");

            echo "\n✅ Configuration complète terminée!\n";
            break;

        default:
            echo "❌ Opération inconnue: $operation\n";
            echo "Opérations disponibles: add_fields, modify_layout, rebuild, full\n";
            exit(1);
    }

} catch (\Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n=== Terminé ===\n";
exit(0);
