FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Node.js, Yarn, and ODBC drivers
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    gnupg2 \
    apt-transport-https \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && apt-get install -y unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app .

# Copy React app and install dependencies
COPY ./react_app ./react_app
WORKDIR /app/react_app
RUN yarn install
RUN yarn build
RUN npm install -g serve

# Return to main app directory
WORKDIR /app

# Install the package in editable mode. Uncomment for easier local development
# RUN pip install -e .

# Create necessary directories
RUN mkdir -p data_viz/

# Set python variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose Flask port and React port
EXPOSE 5000
EXPOSE 3000

# Create a startup script to run both applications
RUN echo '#!/bin/bash\n\
cd /app && python flask_app.py &\n\
cd /app/react_app && npx serve -s dist -p 3000\n\
' > /app/start.sh && chmod +x /app/start.sh

# Default command
CMD ["/bin/bash", "/app/start.sh"]