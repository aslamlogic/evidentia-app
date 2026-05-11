#!/bin/bash
echo "Performing final sync..."
git add .
git commit -m "Final architectural alignment for Render"
git push
echo "DONE. Now update Render settings."
