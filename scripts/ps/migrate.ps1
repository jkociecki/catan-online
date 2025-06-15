# Stop any running containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Start containers
Write-Host "Starting containers..." -ForegroundColor Yellow
docker-compose up -d

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Activate virtual environment and run migrations
Write-Host "Running migrations..." -ForegroundColor Yellow
& .\venv\Scripts\activate
python manage.py migrate

# Start Django server
Write-Host "Starting Django server..." -ForegroundColor Green
python manage.py runserver 