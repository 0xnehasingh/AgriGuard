#!/bin/bash

# 🌾 AgriGuard Setup Script
# Automated deployment and configuration for the parametric crop insurance platform

set -e

echo "🌾 Welcome to AgriGuard Setup"
echo "Parametric Crop Insurance Platform powered by WeatherXM"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi

# Check git
if ! command -v git &> /dev/null; then
    print_error "git is required but not installed."
    exit 1
fi

print_success "Prerequisites check passed"

# Setup environment
print_status "Setting up environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Created .env file from template"
    print_warning "Please edit .env file with your API keys and configuration"
else
    print_warning ".env file already exists"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Install additional Tailwind CSS plugins
print_status "Installing Tailwind CSS plugins..."
npm install -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio

# Setup database (if using local development)
print_status "Setting up database..."

# Check if PostgreSQL is available
if command -v psql &> /dev/null; then
    print_status "PostgreSQL found. Setting up database..."
    
    # Create database if it doesn't exist
    createdb agriguard 2>/dev/null || print_warning "Database 'agriguard' may already exist"
    
    # Run migrations if using Prisma
    if [ -f "prisma/schema.prisma" ]; then
        npx prisma migrate dev --name init
        npx prisma generate
        print_success "Database migrations completed"
    fi
else
    print_warning "PostgreSQL not found. Skipping database setup."
    print_warning "Please ensure your database is configured according to DATABASE_URL in .env"
fi

# Setup Redis (if using local development)
if command -v redis-cli &> /dev/null; then
    print_status "Redis found. Testing connection..."
    redis-cli ping >/dev/null 2>&1 && print_success "Redis connection successful" || print_warning "Redis server may not be running"
else
    print_warning "Redis not found. Please ensure Redis is installed and running for optimal performance."
fi

# Compile smart contracts
print_status "Setting up smart contracts..."

if [ -d "contracts" ]; then
    cd contracts
    
    # Install Hardhat dependencies
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Compile contracts
    npx hardhat compile
    
    if [ $? -eq 0 ]; then
        print_success "Smart contracts compiled successfully"
    else
        print_error "Failed to compile smart contracts"
        cd ..
        exit 1
    fi
    
    # Run tests
    print_status "Running smart contract tests..."
    npx hardhat test
    
    if [ $? -eq 0 ]; then
        print_success "Smart contract tests passed"
    else
        print_warning "Some smart contract tests failed"
    fi
    
    cd ..
else
    print_warning "No contracts directory found. Skipping smart contract setup."
fi

# Build the application
print_status "Building the application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Failed to build application"
    exit 1
fi

# Run type checking
print_status "Running type checking..."
npm run type-check

if [ $? -eq 0 ]; then
    print_success "Type checking passed"
else
    print_warning "Type checking found some issues"
fi

# Run linting
print_status "Running linting..."
npm run lint

if [ $? -eq 0 ]; then
    print_success "Linting passed"
else
    print_warning "Linting found some issues"
fi

# Setup git hooks (optional)
if [ -d ".git" ]; then
    print_status "Setting up git hooks..."
    
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
    echo "Linting failed. Please fix issues before committing."
    exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
    echo "Type checking failed. Please fix issues before committing."
    exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix issues before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    print_success "Git pre-commit hook installed"
fi

# Create development scripts
print_status "Creating development scripts..."

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🌾 Starting AgriGuard Development Server"
echo "========================================"

# Start Redis (if local)
if command -v redis-server &> /dev/null; then
    redis-server --daemonize yes >/dev/null 2>&1 || echo "Redis may already be running"
fi

# Start development server
npm run dev
EOF

chmod +x start.sh

# Create deploy script
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying AgriGuard to Production"
echo "===================================="

# Build application
npm run build

# Deploy smart contracts
if [ -d "contracts" ]; then
    cd contracts
    npx hardhat run scripts/deploy.js --network polygon
    cd ..
fi

# Deploy to Vercel (if configured)
if command -v vercel &> /dev/null; then
    vercel deploy --prod
else
    echo "Vercel CLI not found. Please deploy manually or install Vercel CLI."
fi
EOF

chmod +x deploy.sh

print_success "Development scripts created"

# Setup complete
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
print_success "AgriGuard platform is ready for development!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys and configuration"
echo "2. Update WeatherXM API key in .env file"
echo "3. Configure your database connection"
echo "4. Run './start.sh' to start the development server"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run test         - Run tests"
echo "  npm run lint         - Run linting"
echo "  npm run type-check   - Run TypeScript checking"
echo "  ./start.sh           - Start development environment"
echo "  ./deploy.sh          - Deploy to production"
echo ""
echo "Documentation:"
echo "  README.md                 - Project overview"
echo "  IMPLEMENTATION_PLAN.md    - Complete development roadmap"
echo "  .env.example             - Environment configuration template"
echo ""
echo "For WeatherXM integration:"
echo "1. Get your API key from WeatherXM"
echo "2. Add it to .env as WEATHERXM_API_KEY"
echo "3. Review lib/weatherxm.ts for integration details"
echo ""
echo "🌾 Happy farming with AgriGuard! 🚜"
echo ""
print_status "Built with ❤️ for farmers worldwide, powered by WeatherXM" 