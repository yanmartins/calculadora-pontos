#!/bin/bash
# Abre a Calculadora de Pontos como app no macOS (duplo-clique no Finder).
# Sobe o servidor local (Python) em porta FIXA e abre janela standalone (modo app).

cd "$(dirname "$0")" || exit 1
PORT=8000
PROFILE="$HOME/Library/Application Support/pontos-app"   # perfil dedicado (mantém o login do iframe)
URL="http://localhost:${PORT}/index.html"

# --- localizar Python 3 ---
if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else
  osascript -e 'display alert "Python 3 não encontrado" message "Instale em https://www.python.org/downloads/"' >/dev/null 2>&1
  echo "[ERRO] Python 3 nao encontrado."; exit 1
fi

# --- porta FIXA: se livre sobe o servidor; se ocupada, o app já está rodando ---
SRV=""
if lsof -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Servidor já ativo na porta ${PORT} — reabrindo o app."
else
  "$PY" -m http.server "$PORT" >/dev/null 2>&1 &
  SRV=$!
  trap 'kill $SRV 2>/dev/null' EXIT INT TERM
  sleep 1
fi

# --- abrir em modo app (Chrome/Edge); bloqueia até fechar a janela ---
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
if [ -x "$CHROME" ]; then
  "$CHROME" --app="$URL" --user-data-dir="$PROFILE" >/dev/null 2>&1
elif [ -x "$EDGE" ]; then
  "$EDGE" --app="$URL" --user-data-dir="$PROFILE" >/dev/null 2>&1
else
  # sem Chrome/Edge: abre no navegador padrão (servidor fica até Ctrl+C)
  open "$URL"
  [ -n "$SRV" ] && { echo "App em ${URL} — pressione Ctrl+C para parar."; wait "$SRV"; }
fi
