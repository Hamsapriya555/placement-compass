pipeline {
agent any


    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t placement-intelligence-platform .'
            }
        }

        stage('Run Docker Container') {
            steps {
                sh 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                sh 'curl -f http://localhost:8000/v1/health'
            }
        }
    }

    post {
        success {
            echo 'Pipeline executed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }
    }
}

