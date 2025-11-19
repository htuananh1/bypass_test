const assertAuth = (req) => {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/Bearer\s+/i, '').trim();
  return token || null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = assertAuth(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  const gistId = process.env.BACKUP_GIST_ID;
  if (!gistId) {
    return res.status(400).json({ error: 'BACKUP_GIST_ID env var not configured' });
  }

  const payload = await req.json();
  const { filename = `backup-${Date.now()}.tar.gz`, content } = payload || {};
  if (!content) {
    return res.status(400).json({ error: 'content (base64) is required' });
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      files: {
        [filename]: { content },
      },
      description: 'Automated Codespace backup'
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data.message || 'Failed to upload backup', details: data });
  }

  return res.status(200).json({ message: 'Backup uploaded to gist', url: data.html_url });
}
