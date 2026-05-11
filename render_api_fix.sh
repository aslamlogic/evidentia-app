#!/bin/bash
echo "--- Render API Handshake ---"
# Paste your rnd_ key when it asks
read -p "1. Paste your Render API Key (rnd_...): " RENDER_KEY
# Paste your srv_ ID when it asks
read -p "2. Paste your Service ID (srv-...): " SERVICE_ID

echo "Step 1: Overwriting Settings via API..."
curl --request PATCH \
     --url https://api.render.com/v1/services/$SERVICE_ID \
     --header "accept: application/json" \
     --header "authorization: Bearer $RENDER_KEY" \
     --header "content-type: application/json" \
     --data "{
  \"serviceDetails\": {
    \"buildCommand\": \"npm install --legacy-peer-deps --force; npm run build\",
    \"publishPath\": \"out\"
  }
}"

echo -e "\n\nStep 2: Triggering Deploy..."
curl --request POST \
     --url https://api.render.com/v1/services/$SERVICE_ID/deploys \
     --header "accept: application/json" \
     --header "authorization: Bearer $RENDER_KEY" \
     --header "content-type: application/json" \
     --data "{\"clearCache\": \"clear\"}"

echo -e "\n\nDONE. Check your Render logs."
