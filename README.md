# VPS Ubuntu 6h trên GitHub Codespaces

Trọn bộ mã nguồn giúp dựng "VPS" Ubuntu 22.04 trong Codespaces, cấu hình sẵn Docker/Node/Python/Nginx/SSH + XFCE4/VNC/noVNC, tự động backup 30 phút vào GitHub và tự tạo Codespace mới sau 6h.

## Cấu trúc

```
/
├── .devcontainer/devcontainer.json   # Khai báo máy largeMachine, desktop-lite, forward 6080/5901/8080/3000
├── .devcontainer/setup.sh            # Cài Docker/Node/Python/Nginx/SSH, bật VNC+noVNC (pass mặc định vps123)
├── .github/workflows/auto-manager.yml# Gọi API Vercel theo lịch 30' hoặc thủ công
├── api/codespace/*.js                # API (Vercel) tạo Codespace, xem trạng thái, upload backup lên Gist
├── scripts/backup.sh                 # Backup vòng lặp 30', upload Gist/Release bằng GITHUB_TOKEN
├── scripts/restore.sh                # Khôi phục từ file hoặc URL (Gist/Release)
├── scripts/auto-restart.sh           # Theo dõi uptime, backup rồi tạo Codespace mới khi chạm 6h
└── vercel.json                       # Cấu hình route Vercel
```

## Biến môi trường quan trọng

```
GITHUB_TOKEN=<personal access token hoặc token Codespace>
BACKUP_GIST_ID=<ID gist lưu backup>
REPOSITORY_ID=<id repo dùng tạo Codespace>
BACKUP_RELEASE_TAG=codespace-backups
BACKUP_PATHS="$HOME/workspace $HOME/.config /var/www"
VNC_PASSWORD=vps123
MAX_RUNTIME_MINUTES=360
```

## Khởi chạy nhanh

```bash
# 1) Clone repo và mở Codespace 6h với máy largeMachine
gh repo clone <owner/repo>
gh codespace create --repo <owner/repo> --machine largeMachine --idle-timeout 6h

# 2) Trong Codespace, cài mọi thứ (VNC/SSH/Docker...)
.devcontainer/setup.sh

# 3) Bật backup vòng lặp 30'
GITHUB_TOKEN=<token> BACKUP_GIST_ID=<gist_id> scripts/backup.sh auto

# 4) Theo dõi và tự restart khi đạt 6h
GITHUB_TOKEN=<token> BACKUP_GIST_ID=<gist_id> scripts/auto-restart.sh
```

## Truy cập

- **SSH:** `gh codespace ssh -c <TEN_CODESPACE>` (SSH server đã bật trong setup)
- **VNC Web:** `https://<CODESPACE_NAME>-6080.preview.app.github.dev` (mật khẩu mặc định `vps123`)
- **VS Code Web:** `https://<CODESPACE_NAME>.github.dev`
- **API Vercel:** cấu hình domain Vercel, gọi các route `/api/codespace/*` với header `Authorization: Bearer <GITHUB_TOKEN>`

## Backup & Restore

- `scripts/backup.sh [label]`
  - Mặc định backup các thư mục `BACKUP_PATHS` mỗi 30 phút (sử dụng loop nếu `RUN_ONCE` != `true`).
  - Khi có `GITHUB_TOKEN`, script sẽ upload bản nén lên Gist (`BACKUP_GIST_ID`) và Release (`BACKUP_RELEASE_TAG`).
- `scripts/restore.sh <file|url> <target>`: tải (nếu là URL) và giải nén vào đường dẫn đích.

## Tự động restart 6h

`scripts/auto-restart.sh` theo dõi uptime (mặc định 360 phút). Khi chạm ngưỡng nó:

1. Gọi `scripts/backup.sh` một lần.
2. Xóa Codespace hiện tại (nếu `gh` có thông tin) rồi tạo Codespace mới với `--idle-timeout 6h --machine largeMachine`.

## API điều khiển (Vercel)

- `POST /api/codespace/create` → tạo Codespace mới (thân: `{ repository_id?, ref?, retention_period_minutes? }`).
- `GET /api/codespace/status` → danh sách Codespace của token hiện tại.
- `POST /api/codespace/backup` → ghi file base64 vào gist `BACKUP_GIST_ID` (thân: `{ filename?, content }`).

Triển khai bằng Vercel: `vercel --prod` (đã khai báo routes trong `vercel.json`).

## Workflow auto-manager

- Chạy mỗi 30 phút để ping endpoint Vercel backup/status (dùng secret `VERCEL_BACKUP_URL`, `VERCEL_STATUS_URL`).
- Có thể chạy thủ công qua `workflow_dispatch`; log kết quả vào Issue.

## Lưu ý bảo mật

- Token nên được rotate mỗi 7 ngày; đặt trong Secret của Codespace/Vercel/GitHub Actions.
- Sao lưu có thể chứa dữ liệu nhạy cảm — hãy bật GPG hoặc bảo vệ gist (secret gist).
- Giới hạn IP (ví dụ từ Vercel) khi mở API công khai; bật 2FA cho tài khoản GitHub.
