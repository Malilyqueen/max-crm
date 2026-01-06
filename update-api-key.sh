#!/bin/bash
# Generate and set API key for MAX_SUPERADMIN_BOT

USER_ID="694e68435ce129cb6"
API_KEY=$(openssl rand -hex 16)

echo "Updating user $USER_ID with API key: $API_KEY"

docker exec mariadb mysql -uespocrm -pVOTRE_MOT_DE_PASSE_GENERE_2 espocrm -e "UPDATE user SET api_key='$API_KEY' WHERE id='$USER_ID';"

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================"
    echo "SUCCESS: API KEY GENERATED"
    echo "======================================================"
    echo ""
    echo "API Key: $API_KEY"
    echo ""
    echo "Next: Update backend .env with this key"
    echo ""
else
    echo "ERROR: Failed to update API key"
    exit 1
fi