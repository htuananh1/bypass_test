const RATE_LIMIT_MS = 5000;
const CACHE_PREFIX = 'gemini-cache:';
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40
};

let lastRequestAt = 0;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SOLVE_WITH_GEMINI') {
    handleSolveRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('Gemini solve error:', error);
        sendResponse({ ok: false, error: error.message || 'Unknown error' });
      });
    return true;
  }

  if (message?.type === 'CLEAR_CACHE_ENTRY') {
    clearCacheEntry(message.cacheKey).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

async function handleSolveRequest({ apiKey, model, promptParts, cacheKey, useCache, bypassRateLimit }) {
  if (!apiKey) {
    throw new Error('Thiếu API key Gemini. Hãy nhập trong popup.');
  }

  if (!Array.isArray(promptParts) || promptParts.length === 0) {
    throw new Error('Prompt không hợp lệ.');
  }

  const now = Date.now();
  if (!bypassRateLimit && now - lastRequestAt < RATE_LIMIT_MS) {
    const waitMs = RATE_LIMIT_MS - (now - lastRequestAt);
    return {
      ok: false,
      rateLimited: true,
      retryAfter: Math.ceil(waitMs / 1000)
    };
  }

  if (useCache && cacheKey) {
    const cached = await getCache(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = JSON.stringify({
    contents: [{ parts: promptParts }],
    generationConfig: DEFAULT_GENERATION_CONFIG
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  } catch (error) {
    throw new Error('Không thể kết nối tới Gemini. Kiểm tra mạng hoặc quyền truy cập.');
  }

  lastRequestAt = Date.now();

  if (!response.ok) {
    const text = await response.text();
    let message = `Lỗi API (${response.status})`;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error?.message || message;
    } catch (e) {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();

  if (!content) {
    throw new Error('Không nhận được phản hồi từ Gemini.');
  }

  if (useCache && cacheKey) {
    await setCache(cacheKey, content);
  }

  return { ok: true, data: content, fromCache: false };
}

async function getCache(key) {
  const fullKey = CACHE_PREFIX + key;
  return new Promise(resolve => {
    chrome.storage.local.get(fullKey, items => {
      resolve(items[fullKey] || null);
    });
  });
}

async function setCache(key, value) {
  const fullKey = CACHE_PREFIX + key;
  return new Promise(resolve => {
    chrome.storage.local.set({ [fullKey]: value }, () => resolve());
  });
}

async function clearCacheEntry(key) {
  if (!key) return;
  const fullKey = CACHE_PREFIX + key;
  return new Promise(resolve => {
    chrome.storage.local.remove(fullKey, () => resolve());
  });
}
