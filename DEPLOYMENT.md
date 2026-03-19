# Evidentia Legal AI - Deployment Pipeline

## Overview

The Evidentia Legal AI application uses a **GitHub-centred deployment pipeline** with the following components:

| Component | Purpose |
|---|---|
| **GitHub Repository** | Central source of truth for all code |
| **GitHub Actions CI** | Automated build validation on every push |
| **Abacus Apps** | Production hosting at https://evidentia.uk |
| **DeepAgent** | Development environment & deployment trigger |

## Architecture

```
Developer/AI Agent
       │
       ▼
   GitHub (main branch)
       │
       ├──► GitHub Actions CI (auto: build & lint)
       │
       ▼
   DeepAgent Environment
       │  (pull from GitHub)
       ▼
   Abacus Apps Platform
       │  (deploy via console)
       ▼
   https://evidentia.uk
```

## Pipeline Steps

### 1. Code Changes → GitHub
All code changes should be committed and pushed to the `main` branch:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### 2. Automated CI (GitHub Actions)
On every push to `main`, GitHub Actions automatically:
- Installs dependencies
- Runs the linter
- Builds the Next.js application
- Reports success/failure

Check CI status at: https://github.com/aslamlogic/evidentia-app/actions

### 3. Sync to DeepAgent
In your DeepAgent session, run the sync script:
```bash
bash scripts/sync-and-deploy.sh
```

This pulls the latest validated code from GitHub.

### 4. Deploy to Production
After syncing, deploy through one of these methods:
- **Ask DeepAgent**: "Deploy the latest version to production"
- **Apps Management Console**: Navigate to the Evidentia Legal AI app and click "Deploy"

### 5. Verify
Confirm deployment at: https://evidentia.uk

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)
- **Trigger**: Push to `main` or Pull Request
- **Actions**: Install deps → Lint → Build
- **Purpose**: Validate code before deployment

### Deploy Workflow (`.github/workflows/deploy.yml`)
- **Trigger**: Push to `main` or manual dispatch
- **Actions**: Build validation → Deployment readiness check
- **Purpose**: Confirm code is production-ready

## Manual Deployment Trigger

You can manually trigger deployment from GitHub:
1. Go to https://github.com/aslamlogic/evidentia-app/actions
2. Select "Deploy to Abacus" workflow
3. Click "Run workflow"

## Configuration

### GitHub Secrets (Required)
Set these in your repository Settings → Secrets → Actions:

| Secret | Description |
|---|---|
| `ABACUS_API_KEY` | Your Abacus.AI API key for deployment automation |

### Environment Variables
See `.env.example` for required environment variables.

## Setup: Adding GitHub Actions Workflows

The workflow files are located in `.github/workflows/` in your local project but need to be added to GitHub manually due to permission restrictions. To add them:

### Option A: Via GitHub Web UI
1. Go to https://github.com/aslamlogic/evidentia-app
2. Click **Add file** → **Create new file**
3. Name it `.github/workflows/ci.yml`
4. Paste the contents from your local `.github/workflows/ci.yml`
5. Commit directly to `main`
6. Repeat for `.github/workflows/deploy.yml`

### Option B: Via Personal Access Token (PAT)
If you have a GitHub PAT with `workflow` scope:
```bash
cd /home/ubuntu/evidentia_app
git remote set-url origin https://YOUR_PAT@github.com/aslamlogic/evidentia-app.git
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main
```

### Option C: Grant Workflows Permission
Go to https://github.com/apps/abacusai/installations/select_target and grant the `workflows` permission to the Abacus GitHub App for the evidentia-app repository.

## GitHub Secrets Setup

Add this secret in your repository: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `ABACUS_API_KEY` | Your Abacus.AI API key (find at https://abacus.ai) |

## Current Limitations

> **Important**: Abacus AI Deep Agent Apps currently do not support direct GitHub webhook-based auto-deployment. The deployment process requires syncing code through the DeepAgent environment.

### Planned Improvements
- Full auto-deployment when Abacus adds GitHub webhook support
- Automated database migrations on deploy
- Staging environment for pre-production testing

## Troubleshooting

### CI Build Fails
1. Check the GitHub Actions log for specific errors
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set correctly

### Sync Script Fails
1. Ensure git is configured with proper access tokens
2. Check for merge conflicts
3. Verify the repository URL is correct

### Deployment Not Reflecting Changes
1. Confirm the sync pulled the latest commit
2. Check the Abacus Apps Management Console for deploy status
3. Clear browser cache and retry

## Repository
- **GitHub**: https://github.com/aslamlogic/evidentia-app
- **Production**: https://evidentia.uk
- **Abacus Console**: Apps Management Console → "2 - Evidentia Legal AI"

<!-- Railway redeploy trigger: 2026-03-19T17:35 -->
