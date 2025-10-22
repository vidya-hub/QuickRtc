@echo off
REM Simple MediaSoup - Refresh Dependencies Script (Windows)
REM This script builds all the modules and installs them in the example folder

echo Simple MediaSoup - Refreshing Dependencies
echo =============================================

set PROJECT_ROOT=%~dp0..
set EXAMPLE_DIR=%PROJECT_ROOT%\simple_ms_example

echo Project root: %PROJECT_ROOT%
echo Example directory: %EXAMPLE_DIR%

echo.
echo Cleaning previous builds
echo ----------------------------------------
cd /d "%PROJECT_ROOT%"
for %%d in (simple_ms_types simple_ms_server simple_ms_client simple_ms_example) do (
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
echo Building simple_ms_types
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\simple_ms_types"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building simple_ms_types
    exit /b 1
)
echo simple_ms_types built successfully

echo.
echo Building simple_ms_server
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\simple_ms_server"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building simple_ms_server
    exit /b 1
)
echo simple_ms_server built successfully

echo.
echo Building simple_ms_client
echo ----------------------------------------
cd /d "%PROJECT_ROOT%\simple_ms_client"
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error building simple_ms_client
    exit /b 1
)
echo simple_ms_client built successfully

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
if not exist "public\simple_ms_client" mkdir "public\simple_ms_client"

REM Create a copy instead of symlink for Windows compatibility
xcopy /s /y "%PROJECT_ROOT%\simple_ms_client\dist" "public\simple_ms_client\dist\"
echo Development directories created

echo.
echo Verifying builds
echo ----------------------------------------
for %%d in (simple_ms_types simple_ms_server simple_ms_client simple_ms_example) do (
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
echo   • Built simple_ms_types
echo   • Built simple_ms_server
echo   • Built simple_ms_client
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