#!/bin/bash

# Stop any running containers
echo -e "\033[33mStopping existing containers...\033[0m"
docker-compose down

# Start containers
echo -e "\033[33mStarting containers...\033[0m"
docker-compose up -d

# Wait for database to be ready
echo -e "\033[33mWaiting for database to be ready...\033[0m"
sleep 10

# Activate virtual environment and run migrations
echo -e "\033[33mRunning migrations...\033[0m"
source ./venv/bin/activate
python manage.py migrate

# Start Daphne server
echo -e "\033[32mStarting Daphne server...\033[0m"
daphne backend.asgi:application 