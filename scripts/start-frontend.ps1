# Change to frontend directory
Write-Host "Changing to frontend directory..." -ForegroundColor Yellow
cd .\frontend\

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Green
npm start 