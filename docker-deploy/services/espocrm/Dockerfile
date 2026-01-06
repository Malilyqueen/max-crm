# ========================================
# EspoCRM Dockerfile
# Custom fields migration included
# ========================================
FROM espocrm/espocrm:8.3

# Install required tools
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create custom directory structure
RUN mkdir -p /var/www/html/custom/Espo/Custom && \
    chown -R www-data:www-data /var/www/html/custom

# Custom fields and configuration will be mounted from host
# via volume: ./services/espocrm/custom-backup:/var/www/html/custom:ro

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/api/v1/App/user || exit 1

# Default command (inherited from base image)
# Runs Apache with EspoCRM
