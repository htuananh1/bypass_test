const RATE_LIMIT_MS = 5000;
const CACHE_PREFIX = 'cache:';
const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

let lastRequestAt = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SOLVE_QUESTION') {
    handleSolveRequest(message.payload)
      .then((result) => sendResponse({ ok: true, data: result }))
      .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
    return true;
  }
  return false;
});

async function handleSolveRequest(payload) {
  const {
    question,
    context = '',
    apiKey,
    model = DEFAULT_MODEL,
    origin,
    bypassCache = false
  } = payload || {};

  if (!apiKey) {
    throw createError('missing_api_key', 'Chưa có API key. Vui lòng nhập trong Settings.');
  }

  if (!question) {
    throw createError('missing_question', 'Không tìm thấy câu hỏi hợp lệ.');
  }

  const cacheKey = await buildCacheKey(question, origin || '');
  if (!bypassCache) {
    const cached = await readCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const now = Date.now();
  if (now - lastRequestAt < RATE_LIMIT_MS) {
    const wait = Math.ceil((RATE_LIMIT_MS - (now - lastRequestAt)) / 1000);
    throw createError('rate_limited', `Đang bị giới hạn, thử lại sau ${wait}s.`);
  }

  lastRequestAt = now;

  const response = await callGemini(question, context, apiKey, model);
  const normalized = normalizeGeminiResponse(response, question, origin || '');

  await writeCache(cacheKey, normalized);

  return { ...normalized, cached: false };
}

async function buildCacheKey(question, origin) {
  const hash = fnv1aHash(`${question}|${origin}`);
  return `${CACHE_PREFIX}${hash}`;
}

async function readCache(cacheKey) {
  const result = await chrome.storage.local.get(cacheKey);
  return result?.[cacheKey] || null;
}

async function writeCache(cacheKey, value) {
  try {
    await chrome.storage.local.set({ [cacheKey]: value });
  } catch (error) {
    console.warn('Failed to write cache', error);
  }
}

async function callGemini(question, context, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = buildPrompt(question, context);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
  } catch (error) {
    throw createError('network_error', 'Không thể kết nối tới Gemini. Kiểm tra mạng và CORS.', error);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err = classifyHttpError(response.status, text);
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw createError('invalid_json', 'Phản hồi không phải JSON hợp lệ.', error);
  }

  return data;
}

function buildPrompt(question, context) {
  const trimmedContext = (context || '').trim().slice(0, 1500);
  const trimmedQuestion = (question || '').trim().slice(0, 2000);
  return [
    'Bạn là gia sư giỏi. Hãy trả về JSON với khóa: answer (ngắn gọn), summary (1 câu), steps (danh sách có đánh số), sources (mảng URL, nếu không có để trống).',
    'Luôn dùng tiếng Việt cho summary và steps, answer giữ nguyên ngôn ngữ gốc nếu cần.',
    `Câu hỏi:\n${trimmedQuestion}`,
    `Ngữ cảnh trang:\n${trimmedContext}`
  ].join('\n\n');
}

function normalizeGeminiResponse(response, question, origin) {
  if (!response) {
    return baseResult(question, origin, '', '', [], []);
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p?.text || '').join('\n').trim();

  const json = parseJsonFromText(text);

  if (json) {
    return baseResult(
      question,
      origin,
      json.summary || '',
      normalizeSteps(json.steps),
      json.answer || '',
      Array.isArray(json.sources) ? json.sources.map((src) => String(src)) : []
    );
  }

  return baseResult(question, origin, '', [], text || '', []);
}

function baseResult(question, origin, summary, steps, answer, sources) {
  return {
    question,
    origin,
    summary,
    steps,
    answer,
    sources
  };
}

function normalizeSteps(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((step) => String(step));
  }
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function parseJsonFromText(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
  } catch (error) {
    // ignore and try substring parsing
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function classifyHttpError(status, body) {
  const detail = extractErrorMessage(body);
  switch (status) {
    case 401:
    case 403:
      return createError('auth_error', 'API key không hợp lệ hoặc hết hạn.', null, status, detail);
    case 429:
      return createError('rate_limited', 'Đang bị giới hạn, thử lại sau.', null, status, detail);
    default:
      return createError('http_error', `Lỗi ${status}: ${detail || 'Không xác định.'}`, null, status, detail);
  }
}

function extractErrorMessage(body) {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || parsed?.message || '';
  } catch (error) {
    return body.slice(0, 200);
  }
}

function createError(code, message, cause = null, status = null, detail = '') {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.detail = detail;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function serializeError(error) {
  if (!error) return { message: 'Unknown error' };
  return {
    message: error.message || 'Unknown error',
    code: error.code || 'unknown',
    status: error.status || null,
    detail: error.detail || null
  };
}

function fnv1aHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
    hash >>>= 0;
  }
  return (hash >>> 0).toString(16);
}

