const browserApi = typeof chrome !== 'undefined' ? chrome : browser;

const DEFAULT_MODEL = 'gemini-flash-latest';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return;
  }

  const respond = (payload) => {
    try {
      sendResponse(payload);
    } catch (error) {
      console.warn('Unable to deliver response', error);
    }
  };

  (async () => {
    try {
      switch (message.action) {
        case 'ping':
          respond({ ok: true });
          return;
        case 'validate-key':
          await verifyApiKey(message.apiKey, message.model);
          respond({ ok: true });
          return;
        case 'capture-visible-tab': {
          const dataUrl = await captureVisibleTab(sender);
          respond({ ok: true, dataUrl });
          return;
        }
        case 'gemini-request': {
          const text = await sendToGemini(message.payload || {});
          respond({ ok: true, text });
          return;
        }
        default:
          respond({ ok: false, error: serializeError(createError('unknown_action', 'Yêu cầu không được hỗ trợ.')) });
      }
    } catch (error) {
      respond({ ok: false, error: serializeError(error) });
    }
  })();

  return true;
});

async function captureVisibleTab(sender) {
  return new Promise((resolve, reject) => {
    try {
      const targetWindow = sender?.tab?.windowId;
      browserApi.tabs.captureVisibleTab(
        typeof targetWindow === 'number' ? targetWindow : undefined,
        { format: 'jpeg', quality: 90 },
        (dataUrl) => {
          const lastError = browserApi.runtime.lastError;
          if (lastError) {
            reject(createError('capture_failed', lastError.message));
            return;
          }
          if (!dataUrl) {
            reject(createError('capture_failed', 'Không thể chụp màn hình.'));
            return;
          }
          resolve(dataUrl);
        }
      );
    } catch (error) {
      reject(createError('capture_failed', 'Không thể chụp màn hình.', error));
    }
  });
}

async function verifyApiKey(apiKey, model) {
  if (!apiKey) {
    throw createError('missing_api_key', 'Vui lòng nhập API key.');
  }
  await callGemini({ apiKey, model: model || DEFAULT_MODEL, prompt: 'ping' });
}

async function sendToGemini({ apiKey, model, prompt, imageData }) {
  if (!apiKey) {
    throw createError('missing_api_key', 'Vui lòng nhập API key.');
  }
  if (!prompt) {
    throw createError('missing_prompt', 'Thiếu nội dung yêu cầu.');
  }

  return callGemini({ apiKey, model: model || DEFAULT_MODEL, prompt, imageData });
}

async function callGemini({ apiKey, model, prompt, imageData }) {
  const parts = [{ text: prompt }];
  if (imageData) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageData } });
  }

  const endpoint = `${GEMINI_ENDPOINT}${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, topP: 0.95, topK: 40 }
      })
    });
  } catch (error) {
    throw createError('network_error', 'Không thể kết nối tới Gemini.', error);
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw classifyGeminiError(response.status, raw);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw createError('invalid_json', 'Phản hồi không hợp lệ từ Gemini.', error);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('\n')
    .trim();

  if (!text) {
    throw createError('empty_response', 'Không nhận được phản hồi từ Gemini.');
  }

  return text;
}

function classifyGeminiError(status, bodyText) {
  let detail = bodyText ? bodyText.slice(0, 300) : '';
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.error?.message) {
        detail = parsed.error.message;
      }
    } catch (error) {
      // ignore JSON parse errors
    }
  }

  if (status === 401 || status === 403) {
    return createError('auth_error', 'API key không hợp lệ hoặc đã hết hạn.', null, status, detail);
  }
  if (status === 429) {
    return createError('rate_limited', 'Gemini đang giới hạn tốc độ. Vui lòng thử lại sau.', null, status, detail);
  }

  return createError('api_error', detail || `Yêu cầu thất bại với mã ${status}.`, null, status, detail);
}

function createError(code, message, cause = null, status = null, detail = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status ?? null;
  error.detail = detail ?? null;
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

