#!/bin/bash
# Build script for Render deployment

set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

echo "Build completed successfully!"
echo "NOTE: Don't forget to enable PostGIS extension in your database!"
echo "Run: CREATE EXTENSION IF NOT EXISTS postgis;"

