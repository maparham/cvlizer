#!/bin/bash

# CV Optimizer MVP Setup Script
# This script sets up the complete MVP environment

set -e  # Exit on any error

echo "🚀 Setting up CV Optimizer MVP"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Set up environment file
    if [ ! -f ".env" ]; then
        print_status "Creating environment configuration..."
        cp env.example .env
        print_warning "Please edit backend/.env with your OpenAI API key and other configuration"
    fi
    
    # Initialize database
    print_status "Initializing database..."
    python src/database.py
    
    print_success "Backend setup complete"
    cd ..
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    # Set up environment file
    if [ ! -f ".env" ]; then
        print_status "Creating environment configuration..."
        echo "VITE_API_BASE_URL=http://localhost:8000" > .env
    fi
    
    print_success "Frontend setup complete"
    cd ..
}

# Run tests
run_tests() {
    print_status "Running comprehensive test suite..."
    
    if [ -f "run_all_tests.sh" ]; then
        chmod +x run_all_tests.sh
        ./run_all_tests.sh
    else
        print_warning "Test runner not found, skipping tests"
    fi
}

# Main setup process
main() {
    check_prerequisites
    setup_backend
    setup_frontend
    
    echo ""
    echo "🎉 MVP Setup Complete!"
    echo "====================="
    echo ""
    echo "To start the application:"
    echo ""
    echo "1. Start the backend:"
    echo "   cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
    echo ""
    echo "2. Start the frontend (in a new terminal):"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "3. Open your browser to:"
    echo "   http://localhost:3000"
    echo ""
    echo "4. API documentation available at:"
    echo "   http://localhost:8000/docs"
    echo ""
    echo "Don't forget to:"
    echo "- Add your OpenAI API key to backend/.env"
    echo "- Configure other environment variables as needed"
    echo ""
    
    # Ask if user wants to run tests
    read -p "Would you like to run the test suite now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi
}

# Run main function
main "$@"
