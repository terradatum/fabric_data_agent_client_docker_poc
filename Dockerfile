FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app .

# Install the package in editable mode. Uncomment for easier local development
# RUN pip install -e .

# Create necessary directories
RUN mkdir -p data_viz/

# Set python variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose Flask port
EXPOSE 5000

# Default command
CMD ["python", "flask_app.py"]