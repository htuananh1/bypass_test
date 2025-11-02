const extensionApi = typeof chrome !== 'undefined' ? chrome : browser;

const DEFAULT_MODEL = 'gemini-flash-latest';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  switch (message.type) {
    case 'CAPTURE_SCREENSHOT':
      captureScreenshot(sender)
        .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
        .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
      return true;
    case 'CHECK_API_KEY':
      verifyApiKey(message.apiKey, message.model)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
      return true;
    case 'SEND_TO_GEMINI':
      handleGeminiRequest(message.payload)
        .then((text) => sendResponse({ ok: true, data: text }))
        .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
      return true;
    default:
      return false;
  }
});

async function captureScreenshot(sender) {
  const windowId = sender?.tab?.windowId;
  return new Promise((resolve, reject) => {
    try {
      const targetId = typeof windowId === 'number' ? windowId : undefined;
      extensionApi.tabs.captureVisibleTab(targetId, { format: 'jpeg', quality: 90 }, (dataUrl) => {
        const err = extensionApi.runtime.lastError;
        if (err) {
          reject(createError('capture_failed', err.message));
          return;
        }
        resolve(dataUrl);
      });
    } catch (error) {
      reject(createError('capture_failed', 'Không thể chụp màn hình.', error));
    }
  });
}

async function verifyApiKey(apiKey, model) {
  if (!apiKey) {
    throw createError('missing_api_key', 'Vui lòng nhập API key trước.');
  }
  await callGemini({ apiKey, model, prompt: 'ping' });
}

async function handleGeminiRequest(payload) {
  const { apiKey, model, prompt, imageData } = payload || {};
  if (!apiKey) {
    throw createError('missing_api_key', 'Vui lòng nhập API key trước.');
  }
  if (!prompt) {
    throw createError('missing_prompt', 'Thiếu nội dung yêu cầu.');
  }

  const text = await callGemini({ apiKey, model, prompt, imageData });
  return text;
}

async function callGemini({ apiKey, model, prompt, imageData }) {
  const parts = [{ text: prompt }];
  if (imageData) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData } });
  }

  const url = `${GEMINI_ENDPOINT}${encodeURIComponent(model || DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          topK: 40
        }
      })
    });
  } catch (error) {
    throw createError('network_error', 'Không thể kết nối tới Gemini.', error);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw classifyGeminiError(response.status, text);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw createError('invalid_json', 'Phản hồi không hợp lệ từ Gemini.', error);
  }

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part?.text || '').join('\n').trim();
  if (text) {
    return text;
  }

  throw createError('empty_response', 'Không nhận được phản hồi từ Gemini.');
}

function classifyGeminiError(status, bodyText) {
  let detail = bodyText ? bodyText.slice(0, 200) : '';
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.error?.message) {
        detail = parsed.error.message;
      }
    } catch (error) {
      // ignore JSON parse failure
    }
  }

  switch (status) {
    case 401:
    case 403:
      return createError('auth_error', 'API key không hợp lệ hoặc đã hết hạn.', null, status, detail);
    case 429:
      return createError('rate_limited', 'Gemini đang giới hạn tốc độ. Vui lòng thử lại sau.', null, status, detail);
    default:
      return createError('api_error', detail || `Yêu cầu thất bại với mã ${status}.`, null, status, detail);
  }
}

function createError(code, message, cause = null, status = null, detail = '') {
  const error = new Error(message);
  error.code = code;
  error.status = status ?? null;
  error.detail = detail || null;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function serializeError(error) {
  if (!error) {
    return { message: 'Đã xảy ra lỗi không xác định.', code: 'unknown' };
  }
  return {
    message: error.message || 'Đã xảy ra lỗi không xác định.',
    code: error.code || 'unknown',
    status: error.status ?? null,
    detail: error.detail ?? null
  };
}

