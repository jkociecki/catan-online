#!/bin/bash

# Start backend in a new terminal
echo -e "\033[33mStarting backend server...\033[0m"
osascript -e 'tell app "Terminal" to do script "cd '"$PWD"' && ./scripts/start-backend.sh"'

# Wait a bit for backend to initialize
sleep 5

# Start frontend in a new terminal
echo -e "\033[33mStarting frontend server...\033[0m"
osascript -e 'tell app "Terminal" to do script "cd '"$PWD"' && ./scripts/start-frontend.sh"' 