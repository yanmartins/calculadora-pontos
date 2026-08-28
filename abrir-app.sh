#!/usr/bin/env bash
# Abre a Calculadora de Pontos como app: sobe o servidor local (Python) e abre
# uma janela standalone (modo app). Ao FECHAR a janela, o servidor para sozinho.

cd "$(dirname "$0")" || exit 1
PORT=8000
PROFILE="$HOME/.local/share/pontos-app"   # perfil dedicado (guarda os dados do app)

# --- localizar Python 3 ---
if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else
  command -v zenity >/dev/null 2>&1 && zenity --error --text="Python 3 nao encontrado.\nInstale com: sudo apt install python3"
  echo "[ERRO] Python 3 nao encontrado."; exit 1
fi

# PORTA FIXA (8000): origem estável = o login do site de ponto no iframe persiste.
# Se a porta já estiver ocupada, o app provavelmente já está rodando — só reabrimos.
URL="http://localhost:${PORT}/index.html"
SRV=""
if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${PORT} "; then
  echo "Servidor já ativo na porta ${PORT} — reabrindo o app."
else
  "$PY" -m http.server "$PORT" >/dev/null 2>&1 &
  SRV=$!
  trap 'kill $SRV 2>/dev/null' EXIT INT TERM
  sleep 1
fi

# --- abrir em modo app numa instancia dedicada (bloqueia ate a janela fechar) ---
for B in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge microsoft-edge-stable brave-browser; do
  if command -v "$B" >/dev/null 2>&1; then
    "$B" --app="$URL" --user-data-dir="$PROFILE" --class=CalculadoraPontos --name=CalculadoraPontos >/dev/null 2>&1
    exit 0   # janela fechada -> o trap mata o servidor
  fi
done

# --- sem navegador Chromium: usa o padrao (servidor fica ate Ctrl+C) ---
command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL" >/dev/null 2>&1
[ -n "$SRV" ] && { echo "App em $URL — pressione Ctrl+C para parar o servidor."; wait "$SRV"; }
