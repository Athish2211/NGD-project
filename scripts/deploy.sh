#!/usr/bin/env bash
set -euo pipefail

echo "Running deployment script (fallback)."

if [ -d "k8s" ]; then
  echo "Applying Kubernetes manifests from k8s/"
  kubectl apply -f k8s
elif [ -f "docker-compose.yml" ]; then
  echo "Starting docker-compose services"
  docker-compose up -d
else
  echo "No deployment target found (k8s or docker-compose)."
fi
