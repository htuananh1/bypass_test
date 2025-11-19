const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Codespace VPS Control</title>
  <style>
    :root { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; background: #f8fafc; }
    body { margin: 0; padding: 24px; max-width: 960px; }
    h1 { margin: 0 0 16px; }
    section { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
    label { display: block; font-weight: 600; margin-bottom: 4px; }
    input, textarea { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 8px; font-size: 14px; }
    button { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    button.secondary { background: #0f172a; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; max-height: 260px; overflow: auto; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  </style>
</head>
<body>
  <h1>Codespace VPS Control</h1>
  <p>Nhập GitHub token (scope Codespaces + Gists) để tạo máy, xem trạng thái, hoặc đẩy backup.</p>

  <section>
    <label for="token">GitHub Token</label>
    <input id="token" type="password" placeholder="ghp_..." />
    <div class="grid">
      <div>
        <label for="repo">Repository ID</label>
        <input id="repo" type="text" placeholder="Ví dụ: 123456" />
      </div>
      <div>
        <label for="retention">Retention minutes</label>
        <input id="retention" type="number" value="360" />
      </div>
      <div>
        <label for="gist">Backup Gist ID</label>
        <input id="gist" type="text" placeholder="abcd1234" />
      </div>
      <div>
        <label for="filename">Backup filename</label>
        <input id="filename" type="text" placeholder="backup-$(date).tar.gz" />
      </div>
    </div>
    <button id="btn-create">Create Codespace</button>
    <button id="btn-status" class="secondary">Refresh Status</button>
  </section>

  <section>
    <h2>Backup thủ công</h2>
    <label for="content">Nội dung backup (base64)</label>
    <textarea id="content" rows="4" placeholder="Base64 tarball..." ></textarea>
    <button id="btn-backup">Upload to Gist</button>
  </section>

  <section>
    <h2>Kết quả</h2>
    <pre id="output">Chưa có log.</pre>
  </section>

  <script>
    const output = document.getElementById('output');
    const tokenEl = document.getElementById('token');
    const repoEl = document.getElementById('repo');
    const retentionEl = document.getElementById('retention');
    const gistEl = document.getElementById('gist');
    const fileEl = document.getElementById('filename');
    const contentEl = document.getElementById('content');

    function log(message, data) {
      const text = typeof data === 'undefined' ? '' : `\n${JSON.stringify(data, null, 2)}`;
      output.textContent = `[${new Date().toISOString()}] ${message}${text}\n\n${output.textContent}`;
    }

    function authHeaders() {
      const token = tokenEl.value.trim();
      if (!token) throw new Error('Thiếu token');
      return { Authorization: `Bearer ${token}` };
    }

    async function createCodespace() {
      try {
        const headers = { ...authHeaders(), 'Content-Type': 'application/json' };
        const body = {
          repository_id: repoEl.value || undefined,
          retention_period_minutes: Number(retentionEl.value) || 360,
        };
        const res = await fetch('/api/codespace/create', { method: 'POST', headers, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw json;
        log('Created codespace', json);
      } catch (err) {
        log('Create failed', err);
      }
    }

    async function listCodespaces() {
      try {
        const headers = authHeaders();
        const res = await fetch('/api/codespace/status', { headers });
        const json = await res.json();
        if (!res.ok) throw json;
        log('Status', json);
      } catch (err) {
        log('Status failed', err);
      }
    }

    async function uploadBackup() {
      try {
        const headers = { ...authHeaders(), 'Content-Type': 'application/json' };
        const body = {
          filename: fileEl.value || undefined,
          content: contentEl.value.trim(),
          gist_id: gistEl.value || undefined,
        };
        if (!gistEl.value) throw new Error('Thiếu BACKUP_GIST_ID');
        const res = await fetch('/api/codespace/backup', { method: 'POST', headers, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw json;
        log('Backup uploaded', json);
      } catch (err) {
        log('Backup failed', err);
      }
    }

    document.getElementById('btn-create').onclick = createCodespace;
    document.getElementById('btn-status').onclick = listCodespaces;
    document.getElementById('btn-backup').onclick = uploadBackup;
  </script>
</body>
</html>`;

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
