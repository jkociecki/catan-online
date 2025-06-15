FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make wait-for-it.sh executable
RUN chmod +x wait-for-it.sh

# Use wait-for-it.sh to wait for the database
CMD ["./wait-for-it.sh", "db:5432", "--", "gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
