@echo off
echo ========================================
echo  Namvinscom Fantasy — Install Dependencies
echo ========================================
echo.

echo [1/2] Installing Backend Dependencies...
cd /d "%~dp0backend"
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call .\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo [2/2] Installing Frontend Dependencies...
cd /d "%~dp0frontend"
call npm install

echo.
echo ========================================
echo Installation Complete!
echo Run start.bat to start the application.
echo ========================================
pause
