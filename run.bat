@echo off
echo ========================================
echo   ToDoApp - Starting Services
echo ========================================
echo.

cd /d "%~dp0"
if not exist "backend\venv\Scripts\python.exe" (
  echo Set up backend\venv and install requirements first. See README.md.
  pause
  exit /b 1
)
if not exist "backend\.env" (
  echo Create backend\.env using backend\.env.example first.
  pause
  exit /b 1
)

:: Start backend
echo Starting backend on port 8000...
start "ToDoApp Backend" /D "%~dp0backend" cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting frontend on port 3000...
start "ToDoApp Frontend" /D "%~dp0frontend" cmd /c "npx next dev --port 3000"

:: Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ToDoApp is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

:: Stop all processes
echo Stopping services...
taskkill /FI "WindowTitle eq ToDoApp Backend*" /F >nul 2>&1
taskkill /FI "WindowTitle eq ToDoApp Frontend*" /F >nul 2>&1
echo Done!
