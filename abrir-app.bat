@echo off
rem Abre a Calculadora de Pontos: sobe o servidor local (Python) e abre o app
rem em modo aplicativo (janela standalone, como PWA instalado).
rem Uso: duplo-clique neste arquivo.
setlocal
cd /d "%~dp0"
set "PORT=8000"
set "URL=http://localhost:%PORT%/index.html"

rem --- localizar Python 3 ---
set "PY="
where python >nul 2>&1 && set "PY=python"
if not defined PY ( where py >nul 2>&1 && set "PY=py" )
if not defined PY (
  echo [ERRO] Python 3 nao encontrado. Instale em https://www.python.org/downloads/
  echo Marque a opcao "Add Python to PATH" durante a instalacao.
  pause
  exit /b 1
)

rem --- iniciar servidor em nova janela ---
start "Servidor Pontos" %PY% -m http.server %PORT%

rem --- esperar o servidor subir ---
timeout /t 1 /nobreak >nul

rem --- abrir em modo app (Chrome/Edge); senao navegador padrao ---
set "CH1=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CH2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "ED1=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "ED2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%CH1%" ( start "" "%CH1%" --app=%URL% & goto done )
if exist "%CH2%" ( start "" "%CH2%" --app=%URL% & goto done )
if exist "%ED1%" ( start "" "%ED1%" --app=%URL% & goto done )
if exist "%ED2%" ( start "" "%ED2%" --app=%URL% & goto done )
start "" %URL%
:done

echo.
echo ======================================================
echo  Calculadora de Pontos aberta em %URL%
echo  Para parar, feche a janela "Servidor Pontos".
echo ======================================================
