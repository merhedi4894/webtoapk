#!/bin/bash
# Setup script for first-time deployment
# This runs after the app is deployed to set up the database

echo "Running database migration..."
bun run db:push

echo "Creating necessary directories..."
mkdir -p download/apks upload/icons build-workspace

echo "Setup complete!"
