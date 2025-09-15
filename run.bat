@echo off
echo 🚀 Starting CV Optimizer MVP...

echo 🔧 Starting backend server...
start "Backend Server" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level warning"

timeout /t 3 /nobreak >nul

echo 🎨 Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ✅ Both services are starting up!
echo.
echo 🌐 Access the application at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 📝 Both services are running in separate windows.
echo    Close the windows to stop the services.
echo.
pause
