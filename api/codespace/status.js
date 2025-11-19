const assertAuth = (req) => {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/Bearer\s+/i, '').trim();
  return token || null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = assertAuth(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  const response = await fetch('https://api.github.com/user/codespaces', {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data.message || 'Failed to list codespaces', details: data });
  }

  return res.status(200).json({ total: data.total_count, codespaces: data.codespaces });
}
