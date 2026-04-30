pipeline {
    agent any

    // Triggers the pipeline automatically when changes are pushed to GitHub
    triggers {
        //Polling SCM every minute to fetch changes automatically
        pollSCM('* * * * *')
    }

    environment {
        CI = 'false'
    }

    stages {
        stage('Checkout') {
            steps {
                // Fetches the latest code from your GitHub repository
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo 'Installing project dependencies...'
                    if (isUnix()) {
                        sh 'npm run install-deps'
                    } else {
                        bat 'npm run install-deps'
                    }
                }
            }
        }

        stage('Build Client') {
            steps {
                script {
                    echo 'Building React client...'
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
            }
        }

        stage('Deploy Application') {
            steps {
                script {
                    echo 'Deploying application using PM2...'
                    
                    if (isUnix()) {
                        // Stop and delete existing process if it exists, ignore errors if it doesn't
                        sh 'npx pm2 delete dynamic-pricing-app || true'
                        // Start the new process
                        sh 'npx pm2 start npm --name "dynamic-pricing-app" -- start'
                        // Save the PM2 list to resurrect on reboot
                        sh 'npx pm2 save'
                    } else {
                        catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                            bat 'npx pm2 delete dynamic-pricing-app'
                        }
                        bat 'npx pm2 start npm --name "dynamic-pricing-app" -- start'
                        bat 'npx pm2 save'
                    }
                }
            }
        }
    }

    post {
        success {
            echo '===================================================='
            echo ' Pipeline finished successfully!'
            echo ' Application is deployed and running in background.'
            echo '===================================================='
        }
        failure {
            echo '===================================================='
            echo ' Pipeline failed! Please check the logs.'
            echo '===================================================='
        }
    }
}
