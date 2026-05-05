#!/bin/bash
# Vercel Deployment Script for PNC Thesis Tracker
# This script automates the deployment process to Vercel

set -e  # Exit on error

echo "🚀 Starting Vercel Deployment for PNC Thesis Tracker"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$PROJECT_ROOT/web"

print_status "Project root: $PROJECT_ROOT"
print_status "Web directory: $WEB_DIR"
echo ""

# Step 1: Check if we're in the right directory
if [ ! -f "$WEB_DIR/package.json" ]; then
    print_error "package.json not found in $WEB_DIR"
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 2: Check for required files
print_status "Checking required files..."
required_files=(
    "$WEB_DIR/package.json"
    "$WEB_DIR/next.config.ts"
    "$WEB_DIR/tsconfig.json"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_status "All required files found ✓"
echo ""

# Step 3: Install dependencies (if needed)
print_status "Checking dependencies..."
cd "$WEB_DIR"

if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_status "Dependencies installed ✓"
else
    print_status "Dependencies already installed ✓"
fi
echo ""

# Step 4: Build the project
print_status "Building the project..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Build successful ✓"
else
    print_error "Build failed!"
    exit 1
fi
echo ""

# Step 5: Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    print_status "Vercel CLI installed ✓"
fi

# Step 6: Deploy to Vercel
print_status "Deploying to Vercel..."
echo ""

# Deploy with current directory context
vercel --prod

if [ $? -eq 0 ]; then
    print_status "Deployment successful! ✓"
    echo ""
    print_status "Your application is now live on Vercel!"
    print_status "Check your deployment at: https://vercel.com/dashboard"
else
    print_error "Deployment failed!"
    exit 1
fi

echo ""
echo "================================================"
print_status "Deployment Complete! 🚀"
print_status "Next steps:"
echo "  1. Configure environment variables in Vercel dashboard"
echo "  2. Deploy Firebase functions separately"
echo "  3. Set up custom domain (optional)"
echo "================================================"
