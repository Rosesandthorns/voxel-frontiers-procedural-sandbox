@echo off
setlocal
set "ELECTRON_RUN_AS_NODE=1"
set "BIOME_SERVER_DATA=%~dp0server-data"
:scan_data
if "%~1"=="" goto start_server
if /I "%~1"=="--data" set "BIOME_SERVER_DATA=%~f2"
shift
goto scan_data
:start_server
set "BIOME_SERVER_BUNDLE=%~dp0resources\biome-server.cjs"
if exist "%BIOME_SERVER_DATA%\updates\biome-server.cjs" set "BIOME_SERVER_BUNDLE=%BIOME_SERVER_DATA%\updates\biome-server.cjs"
"%~dp0Biome.exe" "%BIOME_SERVER_BUNDLE%" %* --data "%BIOME_SERVER_DATA%"
if errorlevel 1 pause
endlocal
