Jenkins automation for automatic or periodic deployment

Overview
- This repository includes a Jenkins Declarative Pipeline (Jenkinsfile) that enables automatic builds and deployments.
- It polls the Git SCM for changes every 15 minutes and can also respond to pushes.
- Build logic supports Node.js, Maven, and Gradle projects. If a Dockerfile exists, Jenkins can build and push a Docker image. If Kubernetes manifests exist, Jenkins deploys via kubectl; otherwise, a fallback deploy script is used.

What’s included
- Jenkinsfile at repo root: automates checkout, build, test, dockerize, and deploy steps.
- scripts/deploy.sh: a generic fallback deployment script for Kubernetes or docker-compose deployments.
- docs/jenkins.md: quick integration guide for configuring Jenkins with this repo.

How to configure Jenkins (high-level)
- Ensure Jenkins has access to your GitHub repository (via credentials) and that the Jenkins agent can run Docker/Kubectl as needed.
- Create the following credentials in Jenkins (or adjust the Jenkinsfile to use your IDs):
  - docker-registry-creds: username/password for Docker registry login.
  - kubeconfig: file credential containing kubeconfig for Kubernetes cluster access.

Environment and customization (in Jenkinsfile)
- DOCKER_REGISTRY: registry host (default placeholder in Jenkinsfile is registry.example.com).
- APP_NAME: the name of your application, used for Docker image tagging.
- NAMESPACE: Kubernetes namespace to deploy into (default: default).

Notes
- If you don’t want periodic polling, you can remove the pollSCM trigger in Jenkinsfile and rely on webhooks from GitHub.
- If your project uses a different build system, adjust the Install & Build stage accordingly (the pipeline already detects several common systems).
- The deploy path prioritizes Kubernetes manifests in k8s/; if not present, it will try deploy.sh; otherwise it logs that deployment is skipped.
