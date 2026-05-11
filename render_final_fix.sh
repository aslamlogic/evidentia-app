#!/bin/bash
echo "--- Render API Force-Build ---"
read -p "1. Paste your Render API Key (rnd_...): " RENDER_KEY
read -p "2. Paste your Service ID (srv-...): " SERVICE_ID

echo "Injecting --force build command..."
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

echo -e "\n\nTriggering new deploy..."
curl --request POST \
     --url https://api.render.com/v1/services/$SERVICE_ID/deploys \
     --header "accept: application/json" \
     --header "authorization: Bearer $RENDER_KEY" \
     --header "content-type: application/json" \
     --data "{\"clearCache\": \"clear\"}"

echo -e "\n\nDONE. The build is now forced. Check your logs."
