#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "[setup] Updating apt cache..."
sudo apt-get update -y

echo "[setup] Installing base packages..."
sudo apt-get install -y \
  docker.io \
  docker-compose-plugin \
  nodejs npm \
  python3 python3-pip \
  nginx \
  openssh-server \
  xfce4 xfce4-goodies \
  tightvncserver novnc websockify \
  curl git jq tmux htop

echo "[setup] Enabling and starting SSH server..."
sudo systemctl enable ssh --now || sudo service ssh restart || true

VNC_PASSWORD=${VNC_PASSWORD:-vps123}
VNC_USER=${VNC_USER:-$(id -un)}
VNC_DISPLAY=${VNC_DISPLAY:-:1}

mkdir -p "$HOME/.vnc"
echo "$VNC_PASSWORD" | vncpasswd -f >"$HOME/.vnc/passwd"
chmod 600 "$HOME/.vnc/passwd"

cat >"$HOME/.vnc/xstartup" <<'EOF'
#!/bin/sh
unset DBUS_SESSION_BUS_ADDRESS
startxfce4 &
EOF
chmod +x "$HOME/.vnc/xstartup"

echo "[setup] Starting VNC server on display $VNC_DISPLAY..."
vncserver -kill "$VNC_DISPLAY" >/dev/null 2>&1 || true
vncserver "$VNC_DISPLAY" -geometry 1280x720 -depth 24

echo "[setup] Launching noVNC proxy on 6080..."
nohup websockify --web=/usr/share/novnc/ 6080 localhost 5901 >/tmp/novnc.log 2>&1 &

echo "[setup] Ensuring docker group membership..."
if ! groups "$VNC_USER" | grep -q docker; then
  sudo usermod -aG docker "$VNC_USER"
fi

echo "[setup] Completed base setup for Codespace VPS."
