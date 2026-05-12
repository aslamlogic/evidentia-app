#!/bin/bash
set -e

echo "Renaming 'app' folder to 'frontend' to fix Next.js directory detection..."
git mv app frontend

echo "Committing the structural fix..."
git add .
git commit -m "Fix: Rename app folder to frontend (resolves Next.js 'no app directory' error)"

echo "Pushing to GitHub..."
git push origin main

echo "✅ Done. Folder is now named 'frontend'."
