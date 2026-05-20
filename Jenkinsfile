pipeline {
agent any


    stages {

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t placement-intelligence-platform .'
            }
        }

        stage('Run Docker Container') {
            steps {
                bat 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                bat 'curl http://localhost:8000/v1/health'
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

