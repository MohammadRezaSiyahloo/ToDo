@echo off
echo ========================================
echo   ToDoApp - Starting Services
echo ========================================
echo.

:: Kill any existing processes on ports 3000 and 8000
echo Stopping existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: Recreate database to clear stale timers
echo Resetting database...
cd /d "%~dp0backend"
venv\Scripts\python.exe -c "from app.database import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine); print('Database ready')"
cd /d "%~dp0"

:: Start backend
echo Starting backend on port 8000...
start "ToDoApp Backend" /D "%~dp0backend" cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

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
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo Done!
