const RATE_LIMIT_MS = 5000;
const CACHE_PREFIX = 'gpt-cache:';
const API_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const SYSTEM_PROMPT = [
  'Bạn là gia sư AI chuyên giải bài tập cho học sinh và sinh viên.',
  'Hãy đọc kỹ đề bài, tự nhận diện môn học phù hợp và ghi rõ môn ở đầu câu trả lời theo dạng "Môn: <tên môn>".',
  'Luôn kiểm tra tính chính xác của dữ kiện trước khi sử dụng, nêu rõ mọi giả định và thông báo nếu đề bài thiếu thông tin quan trọng.',
  'Chỉ cung cấp nội dung được yêu cầu, không thêm lời chào hoặc ký tên.'
].join(' ');
const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.2,
  topP: 0.95,
  maxTokens: 1200
};

let lastRequestAt = 0;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SOLVE_WITH_GEMINI') {
    handleSolveRequest(message.payload)
      .then(sendResponse)
      .catch(error => {
        console.error('GPT solve error:', error);
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
    throw new Error('Thiếu API key Vercel. Hãy nhập trong popup.');
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

  const promptText = promptParts
    .map(part => (typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!promptText) {
    throw new Error('Prompt không hợp lệ.');
  }

  const url = `${API_BASE_URL}/chat/completions`;

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: promptText }
    ],
    temperature: DEFAULT_GENERATION_CONFIG.temperature,
    top_p: DEFAULT_GENERATION_CONFIG.topP,
    max_tokens: DEFAULT_GENERATION_CONFIG.maxTokens
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  } catch (error) {
    throw new Error('Không thể kết nối tới GPT. Kiểm tra mạng hoặc quyền truy cập.');
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
  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Không nhận được phản hồi từ GPT.');
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
