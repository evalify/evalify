// frontend-repo/Jenkinsfile

pipeline {
    agent {
        // Use a Node.js agent that also has Docker installed or available
        docker {
            image 'jenkins-agent-node-docker:latest' // Custom image with docker-cli
            args "-v /var/run/docker.sock:/var/run/docker.sock --group-add ${env.DOCKER_GID}" // Mount docker socket
        }
    }

    parameters {
        string(name: 'HARBOR_CREDENTIALS_ID', defaultValue: 'harbor-credentials', description: 'The ID of your Harbor credentials in Jenkins')
    }

    environment {
        HARBOR_URL = "harbor.${env.DOMAIN}"
        APP_BACKEND_DOMAIN = "api.${env.DOMAIN}"
        IMAGE_NAME = "${HARBOR_URL}/evalify/app"
    }

    stages {
    
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    def branchName = env.BRANCH_NAME.replaceAll('/', '-')
                    env.IMAGE_TAG = env.TAG_NAME ?: "${branchName}-${env.BUILD_NUMBER}"
                }
            }
        }

        // stage('Unit & Component Tests') {
        //     steps {
        //         // Install dependencies and run tests using yarn/npm
        //         sh 'yarn install --frozen-lockfile'
        //         sh 'yarn test'
        //     }
        // }

        // stage('SAST Scan with SonarQube') {
        //     steps {
        //         // Use the official SonarScanner CLI Docker image for the scan
        //         // It will automatically pick up credentials from the wrapper
        //         withSonarQubeEnv('sonarqube-server') {
        //             sh "docker run --rm -v ${pwd()}:/usr/src sonarsource/sonar-scanner-cli:latest"
        //         }
        //         // Pause the pipeline and wait for SonarQube's analysis to complete
        //         timeout(time: 1, unit: 'HOURS') {
        //             waitForQualityGate abortPipeline: true
        //         }
        //     }
        // }
    
        stage('Build & Push Docker Image') {
            when {
                anyOf {
                    branch 'release'
                    branch 'production'
                }
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
                        "--build-arg S3_ENDPOINT=http://minio.${env.DOMAIN}:9000 " +
                        "--build-arg S3_ACCESS_KEY_ID=minio " +
                        "--build-arg S3_SECRET_ACCESS_KEY=minio123 " +
                        "--build-arg S3_BUCKET_NAME=evalify " +
                        "--build-arg S3_REGION=us-east-1 " +
                        "-f Dockerfile.bun ."
                    )
                    // Push the final image to your Harbor registry
                    docker.withRegistry("https://${HARBOR_URL}", 'harbor-credentials') {
                        customImage.push()
                    }
                }
            }

        }
        
        // stage('Container Vulnerability Scan') {
        //     when {
        //         anyOf {
        //             branch 'release'
        //             branch 'production'
        //         }
        //     }
        //     steps {
        //         // Use Trivy to scan the newly pushed image for OS or dependency vulnerabilities
        //         sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.52.2 image --exit-code 1 --severity CRITICAL,HIGH ${IMAGE_NAME}:${IMAGE_TAG}"
        //     }
        // }
    }
}
