@echo off
REM QuickRTC - Refresh Dependencies Script (Windows)
REM This script builds all the modules and installs them in the example folder

echo QuickRTC - Refreshing Dependencies
echo =============================================

set PROJECT_ROOT=%~dp0..
set EXAMPLE_DIR=%PROJECT_ROOT%\quickrtc_example

echo Project root: %PROJECT_ROOT%
echo Example directory: %EXAMPLE_DIR%

echo.
echo Cleaning previous builds
echo ----------------------------------------
cd /d "%PROJECT_ROOT%"
for %%d in (quickrtc_types quickrtc_server quickrtc_client quickrtc_example) do (
    if exist "%%d\dist" (
        echo Cleaning %%d\dist
        rmdir /s /q "%%d\dist"
    )
    if exist "%%d\node_modules" (
        echo Cleaning %%d\node_modules
        rmdir /s /q "%%d\node_modules"
    )
)
echo Previous builds cleaned

echo.
echo Building quickrtc_types
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\quickrtc_types"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building quickrtc_types
    exit /b 1
)
echo quickrtc_types built successfully

echo.
echo Building quickrtc_server
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\quickrtc_server"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building quickrtc_server
    exit /b 1
)
echo quickrtc_server built successfully

echo.
echo Building quickrtc_client
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\quickrtc_client"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building quickrtc_client
    exit /b 1
)
echo quickrtc_client built successfully

echo.
echo Installing dependencies in example project
echo ----------------------------------------
cd /d "%EXAMPLE_DIR%"
call npm install
if %errorlevel% neq 0 (
    echo Error installing example project dependencies
    exit /b 1
)
echo Example project dependencies installed

echo.
echo Building example project
echo ----------------------------------------
call npm run build:example
if %errorlevel% neq 0 (
    echo Error building example project
    exit /b 1
)
echo Example project built successfully

echo.
echo Creating development directories
echo ----------------------------------------
if not exist "public\quickrtc_client" mkdir "public\quickrtc_client"

REM Create a copy instead of symlink for Windows compatibility
xcopy /s /y "%PROJECT_ROOT%\quickrtc_client\dist" "public\quickrtc_client\dist\"
echo Development directories created

echo.
echo Verifying builds
echo ----------------------------------------
for %%d in (quickrtc_types quickrtc_server quickrtc_client quickrtc_example) do (
    if exist "%PROJECT_ROOT%\%%d\dist" (
        echo %%d/dist exists
    ) else (
        echo Error: %%d/dist not found
        exit /b 1
    )
)

echo.
echo All dependencies refreshed successfully!
echo.
echo What was done:
echo   • Cleaned all previous builds and node_modules
echo   • Built quickrtc_types
echo   • Built quickrtc_server
echo   • Built quickrtc_client
echo   • Installed example project dependencies
echo   • Built example project
echo   • Created development directories
echo.
echo You can now run the example server:
echo   npm start        # HTTP server
echo   npm start:https  # HTTPS server
echo.
echo For development with auto-rebuild:
echo   npm run watch        # HTTP with auto-reload
echo   npm run watch:https  # HTTPS with auto-reload

pause