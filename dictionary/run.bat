@echo off
setlocal
set "SAVED_CD=%CD%"
cd /d "%~dp0"

if exist ".venv\Scripts\activate.bat" (
    set "ACTIVATE=.venv\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
    set "ACTIVATE=venv\Scripts\activate.bat"
) else (
    echo No venv found. Create one with: python -m venv .venv
    cd /d "%SAVED_CD%"
    endlocal
    exit /b 1
)

cmd /c "call "%ACTIVATE%" && python main.py"
set "EXIT_CODE=%ERRORLEVEL%"

cd /d "%SAVED_CD%"
endlocal
exit /b %EXIT_CODE%
