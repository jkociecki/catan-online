#!/bin/bash

# Change to frontend directory
echo -e "\033[33mChanging to frontend directory...\033[0m"
cd ./frontend/

# Install dependencies
echo -e "\033[33mInstalling dependencies...\033[0m"
npm install

# Start frontend server
echo -e "\033[32mStarting frontend server...\033[0m"
npm start 