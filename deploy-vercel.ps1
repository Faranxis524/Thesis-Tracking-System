# Vercel Deployment Script for PNC Thesis Tracker (PowerShell)
# Run this script from the project root directory

Write-Host "🚀 Starting Vercel Deployment for PNC Thesis Tracker" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Colors
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

function Print-Status {
    Write-Host "[INFO] $args" -ForegroundColor $Green
}

function Print-Warning {
    Write-Host "[WARN] $args" -ForegroundColor $Yellow
}

function Print-Error {
    Write-Host "[ERROR] $args" -ForegroundColor $Red
}

# Navigate to project root
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebDir = Join-Path $ProjectRoot "web"

Print-Status "Project root: $ProjectRoot"
Print-Status "Web directory: $WebDir"
Write-Host ""

# Step 1: Check if we're in the right directory
$PackageJsonPath = Join-Path $WebDir "package.json"
if (-not (Test-Path $PackageJsonPath)) {
    Print-Error "package.json not found in $WebDir"
    Print-Error "Please run this script from the project root directory"
    exit 1
}

# Step 2: Check for required files
Print-Status "Checking required files..."
$requiredFiles = @(
    $PackageJsonPath,
    (Join-Path $WebDir "next.config.ts"),
    (Join-Path $WebDir "tsconfig.json")
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Print-Error "Required file not found: $file"
        exit 1
    }
}
Print-Status "All required files found ✓"
Write-Host ""

# Step 3: Navigate to web directory
Set-Location $WebDir

# Step 4: Install dependencies (if needed)
if (-not (Test-Path "node_modules")) {
    Print-Status "Installing dependencies..."
    npm install
    Print-Status "Dependencies installed ✓"
} else {
    Print-Status "Dependencies already installed ✓"
}
Write-Host ""

# Step 5: Build the project
Print-Status "Building the project..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Print-Error "Build failed!"
    exit 1
}
Print-Status "Build successful ✓"
Write-Host ""

# Step 6: Check if Vercel CLI is installed
$vercelInstalled = npm list -g --depth=0 vercel 2>$null
if (-not $vercelInstalled) {
    Print-Warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    Print-Status "Vercel CLI installed ✓"
}

# Step 7: Deploy to Vercel
Print-Status "Deploying to Vercel..."
Write-Host ""

vercel --prod

if ($LASTEXITCODE -eq 0) {
    Print-Status "Deployment successful! ✓"
    Write-Host ""
    Print-Status "Your application is now live on Vercel!"
    Print-Status "Check your deployment at: https://vercel.com/dashboard"
} else {
    Print-Error "Deployment failed!"
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Print-Status "Deployment Complete! 🚀"
Write-Host "Next steps:"
Write-Host "  1. Configure environment variables in Vercel dashboard"
Write-Host "  2. Deploy Firebase functions separately"
Write-Host "  3. Set up custom domain (optional)"
Write-Host "================================================" -ForegroundColor Green
