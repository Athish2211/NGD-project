pipeline {
  agent none

  // Runs daily at ~2:00 AM (Jenkins hashes the minutes)
  triggers {
    cron('H 2 * * *')
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'PRODUCTS_DATASET_URL', defaultValue: '', description: 'Optional public JSON dataset URL (legal/demo). If empty, uses PRODUCTS_DATASET_FILE.')
    string(name: 'PRODUCTS_DATASET_FILE', defaultValue: 'server/scripts/datasets/indian_products_sample.json', description: 'Dataset file path inside the repo.')
    booleanParam(name: 'DEACTIVATE_MISSING', defaultValue: false, description: 'If true, sets products not present in dataset to is_active=false.')
  }

  environment {
    PRODUCTS_DATASET_URL = "${params.PRODUCTS_DATASET_URL}"
    PRODUCTS_DATASET_FILE = "${params.PRODUCTS_DATASET_FILE}"
    DEACTIVATE_MISSING = "${params.DEACTIVATE_MISSING}"
    // Required: set this in Jenkins job/global environment (or via withCredentials).
    // DATABASE_URL = 'postgresql://user:pass@host:5432/dynamic_pricing_ecommerce'
  }

  stages {
    stage('Checkout') {
      agent any
      steps {
        checkout scm
      }
    }

    stage('Setup (Deps)') {
      agent {
        docker {
          image 'node:16'
          args '-u root'
          reuseNode true
        }
      }
      steps {
        // IMPORTANT: Provide DATABASE_URL in Jenkins (global env var, or withCredentials).
        sh '''
          cd server
          npm ci
        '''
      }
    }

    stage('Extract') {
      agent {
        docker {
          image 'node:16'
          args '-u root'
          reuseNode true
        }
      }
      steps {
        sh '''
          cd server
          npm run setup-db
          cd ..
          node server/scripts/extract-products.js \
            --dataset-url="${PRODUCTS_DATASET_URL}" \
            --dataset-file="${PRODUCTS_DATASET_FILE}" \
            --deactivate-missing="${DEACTIVATE_MISSING}"
        '''
      }
    }

    stage('Test (Verify Import)') {
      agent {
        docker {
          image 'node:16'
          args '-u root'
          reuseNode true
        }
      }
      steps {
        sh '''
          node server/scripts/verify-product-import.js \
            --dataset-file="${PRODUCTS_DATASET_FILE}"
        '''
      }
    }

    stage('Sync NCDEX Live Prices') {
      agent {
        docker {
          image 'node:16'
          args '-u root'
          reuseNode true
        }
      }
      steps {
        sh '''
          cd server
          npm run sync-ncdex-prices
        '''
      }
    }
  }

  post {
    success {
      script {
        if (env.SLACK_WEBHOOK_URL?.trim()) {
          def msg = "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}\\n${env.BUILD_URL}"
          withEnv(["SLACK_MESSAGE=${msg}"]) {
            sh '''
              node -e "const https=require('https');const webhook=process.env.SLACK_WEBHOOK_URL;const msg=process.env.SLACK_MESSAGE;const payload=JSON.stringify({text:msg});const u=new URL(webhook);const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{res.on('data',()=>{});res.on('end',()=>{process.exit(res.statusCode>=200&&res.statusCode<300?0:1);});});req.on('error',()=>process.exit(1));req.write(payload);req.end();"
            '''
          }
        } else {
          echo 'SLACK_WEBHOOK_URL not set; skipping Slack notification.'
        }
      }
    }
    failure {
      script {
        if (env.SLACK_WEBHOOK_URL?.trim()) {
          def msg = "FAILURE: ${env.JOB_NAME} #${env.BUILD_NUMBER}\\n${env.BUILD_URL}"
          withEnv(["SLACK_MESSAGE=${msg}"]) {
            sh '''
              node -e "const https=require('https');const webhook=process.env.SLACK_WEBHOOK_URL;const msg=process.env.SLACK_MESSAGE;const payload=JSON.stringify({text:msg});const u=new URL(webhook);const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{res.on('data',()=>{});res.on('end',()=>{process.exit(res.statusCode>=200&&res.statusCode<300?0:1);});});req.on('error',()=>process.exit(1));req.write(payload);req.end();"
            '''
          }
        } else {
          echo 'SLACK_WEBHOOK_URL not set; skipping Slack notification.'
        }
      }
    }
  }
}

