#!/bin/bash

echo "🚀 Setting up CV Optimizer MVP..."

# Create virtual environment for backend
echo "📦 Setting up Python backend..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# Install frontend dependencies
echo "📦 Setting up React frontend..."
cd frontend
npm install
cd ..

# Create environment files
echo "⚙️ Creating environment files..."
cp backend/env.example backend/.env
echo "VITE_API_BASE_URL=http://localhost:8000" > frontend/.env

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   Backend:  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
