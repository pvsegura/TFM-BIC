#!/usr/bin/env bash
# Installs Piper (offline neural TTS, MIT) and Verbysia's narrator voice into ~/piper (WSL Ubuntu).
# The narrator is always the same voice: es_ES "mls_10246" (low), chosen as the highest-pitched
# (youngest-sounding) Spain-Spanish voice that runs with this Piper release.
# Run once: wsl -d Ubuntu -- bash infrastructure/tts/setup-piper.sh
set -euo pipefail
DIR="$HOME/piper"
VOICE="es_ES-mls_10246-low"
VOICE_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/mls_10246/low"
mkdir -p "$DIR"
cd "$DIR"
if [ ! -x piper/piper ]; then
  curl -sSL -o piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz
  tar -xzf piper.tar.gz
  rm piper.tar.gz
fi
for f in "$VOICE.onnx" "$VOICE.onnx.json"; do
  [ -f "$f" ] || curl -sSL -o "$f" "$VOICE_BASE/$f"
done
echo "Piper ready in $DIR with $VOICE"
