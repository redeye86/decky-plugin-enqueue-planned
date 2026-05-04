#!/usr/bin/env bash
set -euo pipefail

DECK_IP="192.168.101.234"
DECK_USER="deck"
PLUGIN_NAME="nqueue"
LOCAL_DIR="/home/redeye/projects/decky-nque"
REMOTE_PLUGIN_DIR="/home/deck/homebrew/plugins/${PLUGIN_NAME}"
REMOTE_ZIP="/tmp/nqueue-decky.zip"

echo "[1/4] Building zip package..."
cd "$LOCAL_DIR"
zip -r -q nqueue-decky.zip dist main.py plugin.json package.json README.md LICENSE

echo "[2/4] Uploading package to Steam Deck (/tmp)..."
scp "$LOCAL_DIR/nqueue-decky.zip" "${DECK_USER}@${DECK_IP}:${REMOTE_ZIP}"

echo "[3/4] Installing package with sudo..."
ssh -tt "${DECK_USER}@${DECK_IP}" "sudo mkdir -p '${REMOTE_PLUGIN_DIR}' && sudo unzip -o '${REMOTE_ZIP}' -d '${REMOTE_PLUGIN_DIR}' && sudo chown -R ${DECK_USER}:${DECK_USER} '${REMOTE_PLUGIN_DIR}'"

echo "[4/4] Cleaning up temp zip..."
ssh "${DECK_USER}@${DECK_IP}" "rm -f '${REMOTE_ZIP}'"

echo

echo "Done. Restart Steam (or Decky) on the Deck."
echo "Plugin path: ${REMOTE_PLUGIN_DIR}"
