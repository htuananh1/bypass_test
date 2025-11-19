#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "[!] Vui lòng chạy script với quyền sudo/root trong Codespace" >&2
  exit 1
fi

CODESPACE_NAME=${CODESPACE_NAME:-}
if [[ -z "$CODESPACE_NAME" ]]; then
  CODESPACE_NAME=$(gh codespace list --json name,state --limit 1 | jq -r '.[0].name' 2>/dev/null || true)
fi

apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  openssh-server ufw vim htop tmux curl git jq

useradd -m -s /bin/bash codespace 2>/dev/null || true
echo "codespace:codespace" | chpasswd
mkdir -p /home/codespace/.ssh
chmod 700 /home/codespace/.ssh
chown -R codespace:codespace /home/codespace/.ssh

echo "AllowTcpForwarding yes" >> /etc/ssh/sshd_config
grep -q '^Port 2222' /etc/ssh/sshd_config || echo 'Port 2222' >> /etc/ssh/sshd_config
systemctl enable ssh --now

ufw allow 2222/tcp || true

IP_ADDR=$(hostname -I | awk '{print $1}')

cat <<INFO
Đã cấu hình xong VPS tạm thời:
- User: codespace / mật khẩu: codespace (hãy đổi sau khi đăng nhập)
- SSH: cổng 2222 nội bộ
- IP nội bộ: $IP_ADDR

Đăng nhập từ máy cục bộ (cần gh CLI):
gh codespace ssh -c ${CODESPACE_NAME:-<TEN_CODESPACE>} -- -p 2222
INFO
