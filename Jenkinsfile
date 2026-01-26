// frontend-repo/Jenkinsfile

pipeline {
    agent {
        // Use a Node.js agent that also has Docker installed or available
        docker {
            image 'node:20-bookworm' // A standard Node image
            args '-v /var/run/docker.sock:/var/run/docker.sock' // Mount docker socket for Trivy
        }
    }

    parameters {
        string(name: 'HARBOR_CREDENTIALS_ID', defaultValue: 'harbor-credentials', description: 'The ID of your Harbor credentials in Jenkins')
    }

    environment {
        HARBOR_URL = "harbor.${env.DOMAIN}"
        APP_BACKEND_DOMAIN = "api.${env.DOMAIN}"
        IMAGE_NAME = "${HARBOR_URL}/evalify/app"
        IMAGE_TAG = env.TAG_NAME ?: "${env.BRANCH_NAME}-${env.BUILD_NUMBER}".replaceAll('/', '-')
    }

    stages {
    
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // stage('Unit & Component Tests') {
        //     steps {
        //         // Install dependencies and run tests using yarn/npm
        //         sh 'yarn install --frozen-lockfile'
        //         sh 'yarn test'
        //     }
        // }

        stage('SAST Scan with SonarQube') {
            steps {
                // Use the official SonarScanner CLI Docker image for the scan
                // It will automatically pick up credentials from the wrapper
                withSonarQubeEnv('sonarqube-server') {
                    sh "docker run --rm -v ${pwd()}:/usr/src sonarsource/sonar-scanner-cli:latest"
                }
                // Pause the pipeline and wait for SonarQube's analysis to complete
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    
        stage('Build & Push Docker Image') {
            when {
                branch 'release'
            }
            steps {
                script {
                    echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"
                    // Build the multi-stage Dockerfile, passing build arguments
                    def customImage = docker.build(
                        "${IMAGE_NAME}:${IMAGE_TAG}", 
                        "--build-arg NEXT_PUBLIC_POSTHOG_KEY=${env.NEXT_PUBLIC_POSTHOG_KEY} " +
                        "--build-arg NEXT_PUBLIC_POSTHOG_HOST=${env.NEXT_PUBLIC_POSTHOG_HOST} " +
                        "--build-arg NEXT_PUBLIC_POSTHOG_ENABLE=${env.NEXT_PUBLIC_POSTHOG_ENABLE} " +
                        "-f Dockerfile.bun ."
                    )
                    // Push the final image to your Harbor registry
                    docker.withRegistry("https://${HARBOR_URL}", 'harbor-credentials') {
                        customImage.push()
                    }
                }
            }

        }
        
        stage('Container Vulnerability Scan') {
            when {
                branch 'release'
            }
            steps {
                // Use Trivy to scan the newly pushed image for OS or dependency vulnerabilities
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.52.2 image --exit-code 1 --severity CRITICAL,HIGH ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        
        stage('Trigger Deploy') {
            when {
                branch 'release'
            }
            steps {
                echo "Deploying release version: ${IMAGE_TAG}"
                // Trigger the central deployment pipeline, passing the new image tag as a parameter
                build job: 'Deployer_Pipeline', parameters: [
                    string(name: 'APP_IMAGE_URL', value: "${IMAGE_NAME}:${IMAGE_TAG}")
                ]
            }
        }
    }
}
