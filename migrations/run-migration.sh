#!/bin/bash

# Migration Runner Script
# This script helps you run the migration using psql

echo "=========================================="
echo "Multi-Tenant Organization Migration"
echo "=========================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed."
    echo "   Install PostgreSQL client tools or use Supabase Dashboard instead."
    echo ""
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

echo "To run this migration, you need your Supabase connection details."
echo ""
echo "You can find these in your Supabase Dashboard:"
echo "  1. Go to Project Settings > Database"
echo "  2. Look for 'Connection string' or 'Connection pooling'"
echo "  3. Or use 'Host', 'Database name', 'Port', 'User', 'Password'"
echo ""

# Check for environment variables
if [ -f .env.local ]; then
    echo "Found .env.local file. Checking for Supabase connection details..."
    source .env.local
    
    if [ -n "$DATABASE_URL" ]; then
        echo "✅ Found DATABASE_URL in .env.local"
        echo ""
        read -p "Use DATABASE_URL from .env.local? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            psql "$DATABASE_URL" -f migrations/001_multi_tenant_schema.sql
            exit $?
        fi
    fi
fi

echo ""
echo "Please provide your Supabase connection details:"
echo ""

read -p "Database Host (e.g., db.xxxxx.supabase.co): " DB_HOST
read -p "Database Name (usually 'postgres'): " DB_NAME
read -p "Database Port (usually 5432): " DB_PORT
read -p "Database User (usually 'postgres'): " DB_USER
read -s -p "Database Password: " DB_PASSWORD
echo ""

# Construct connection string
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo ""
echo "Running migration..."
echo ""

psql "$CONNECTION_STRING" -f migrations/001_multi_tenant_schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
