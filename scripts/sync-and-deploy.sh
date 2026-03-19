#!/bin/bash
# =============================================================================
# Evidentia Legal AI - Sync & Deploy Script
# =============================================================================
# This script pulls the latest code from GitHub and prepares for Abacus deployment.
# Run this in your DeepAgent environment to sync changes from GitHub.
#
# Usage:
#   bash scripts/sync-and-deploy.sh
#
# Prerequisites:
#   - Git configured with access to the repository
#   - Running inside the DeepAgent environment
# =============================================================================

set -e

# Configuration
REPO_DIR="/home/ubuntu/evidentia_app"
GITHUB_REPO="https://github.com/aslamlogic/evidentia-app.git"
BRANCH="main"

echo "======================================="
echo "Evidentia Legal AI - Sync & Deploy"
echo "======================================="
echo ""

# Step 1: Check if we're in the right directory
if [ ! -d "$REPO_DIR" ]; then
    echo "❌ Project directory not found at $REPO_DIR"
    exit 1
fi

cd "$REPO_DIR"

# Step 2: Check git status
echo "📋 Current git status:"
git status --short
echo ""

# Step 3: Stash any local changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Local changes detected. Stashing..."
    git stash
    echo "✅ Local changes stashed"
fi

# Step 4: Pull latest from GitHub
echo "📥 Pulling latest changes from GitHub ($BRANCH)..."
git pull origin "$BRANCH" --rebase
echo "✅ Code synced from GitHub"
echo ""

# Step 5: Show what changed
echo "📋 Recent commits:"
git log --oneline -5
echo ""

# Step 6: Validate build
echo "🔨 Validating build..."
if command -v npm &> /dev/null; then
    npm run build 2>&1 | tail -5
    if [ $? -eq 0 ]; then
        echo "✅ Build validated successfully"
    else
        echo "❌ Build failed - please check errors above"
        exit 1
    fi
else
    echo "⚠️  npm not available - skipping build validation"
fi

echo ""
echo "======================================="
echo "✅ Sync complete!"
echo "======================================="
echo ""
echo "Next steps:"
echo "  1. The code is now up to date with GitHub"
echo "  2. Deploy via the Abacus Apps Management Console"
echo "     or ask DeepAgent to deploy the latest version"
echo "  3. Verify at: https://evidentia.uk"
echo ""
