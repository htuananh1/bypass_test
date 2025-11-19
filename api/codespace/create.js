const assertAuth = (req) => {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/Bearer\s+/i, '').trim();
  if (!token) {
    return null;
  }
  return token;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = assertAuth(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  const { repository_id, ref = 'main', retention_period_minutes = 360 } = await req.json();
  const repoId = repository_id || process.env.REPOSITORY_ID;
  if (!repoId) {
    return res.status(400).json({ error: 'repository_id is required' });
  }

  const response = await fetch('https://api.github.com/user/codespaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      repository_id: repoId,
      ref,
      machine: 'largeMachine',
      display_name: `VPS-${Date.now()}`,
      retention_period_minutes,
      devcontainer_path: '.devcontainer/devcontainer.json',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data.message || 'Failed to create codespace', details: data });
  }

  return res.status(200).json({ message: 'Codespace created', codespace: data });
}
