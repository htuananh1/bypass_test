const RATE_LIMIT_MS = 5000;
const CACHE_PREFIX = 'gpt-cache:';
const API_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_CHAT_CONFIG = {
  temperature: 0.2
};

let lastRequestAt = 0;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SOLVE_WITH_GPT') {
    handleSolveRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('AI Gateway solve error:', error);
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

async function handleSolveRequest({ apiKey, model, prompt, cacheKey, useCache, bypassRateLimit }) {
  if (!apiKey) {
    throw new Error('Thiếu API key AI Gateway. Hãy nhập trong popup.');
  }

  if (typeof prompt !== 'string' || !prompt.trim()) {
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

  const url = `${API_BASE_URL}/chat/completions`;

  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'system',
        content: 'Bạn là gia sư thông minh chuyên giải bài tập, trả lời bằng ngôn ngữ đã yêu cầu.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    ...DEFAULT_CHAT_CONFIG
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body
    });
  } catch (error) {
    throw new Error('Không thể kết nối tới AI Gateway. Kiểm tra mạng hoặc quyền truy cập.');
  }

  lastRequestAt = Date.now();

  if (!response.ok) {
    const text = await response.text();
    let message = `Lỗi API (${response.status})`;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error?.message || parsed?.message || message;
    } catch (e) {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Không nhận được phản hồi từ AI Gateway.');
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
