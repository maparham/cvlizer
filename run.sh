#!/bin/bash

# Parse command line arguments
DEBUG_MODE=false
for arg in "$@"; do
    case $arg in
        --debug)
        DEBUG_MODE=true
        shift
        ;;
        -h|--help)
        echo "Usage: $0 [--debug]"
        echo "  --debug    Enable debug logging (shows HTTP requests)"
        echo "  -h, --help Show this help message"
        exit 0
        ;;
        *)
        echo "Unknown option: $arg"
        echo "Use --help for usage information"
        exit 1
        ;;
    esac
done

echo "🚀 Starting CV Optimizer MVP..."

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Error: Port $port is already in use. $service cannot start."
        echo "   Please stop the service using port $port or use a different port."
        exit 1
    fi
}

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if ports are available
echo "🔍 Checking if ports are available..."
check_port 8000 "Backend server"
check_port 3000 "Frontend server"

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate

# Set log level based on debug mode
if [ "$DEBUG_MODE" = true ]; then
    echo "🐛 Debug mode enabled - showing HTTP request logs"
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level info &
else
    echo "🔇 Quiet mode enabled - HTTP logs silenced"
    uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level warning &
fi

BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Verify backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Error: Backend server failed to start"
    exit 1
fi

# Start frontend in background
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

# Verify frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Error: Frontend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Both services are starting up!"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Logs will appear below. Press Ctrl+C to stop both services."
echo "============================================================"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
