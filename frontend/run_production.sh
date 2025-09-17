#!/bin/bash
# Production frontend server runner

echo "🚀 Starting CV Optimizer Frontend in Production Mode..."

# Build the application first
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Exiting."
    exit 1
fi

echo "✅ Build completed successfully!"

# Start the production server
echo "🌐 Starting production server..."
npx vite preview --host 0.0.0.0 --port 3000
