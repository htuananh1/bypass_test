const statusText = document.getElementById('statusText');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKey = document.getElementById('toggleApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const modelSelect = document.getElementById('modelSelect');
const subjectSelect = document.getElementById('subjectSelect');
const outputModeSelect = document.getElementById('outputMode');
const langSelect = document.getElementById('langSelect');
const questionInput = document.getElementById('questionInput');
const customPromptSection = document.getElementById('customPromptSection');
const customPromptInput = document.getElementById('customPrompt');
const cacheToggle = document.getElementById('cacheToggle');
const bypassRateLimitToggle = document.getElementById('bypassRateLimit');
const solveButton = document.getElementById('solveButton');
const refreshSelectionBtn = document.getElementById('refreshSelection');
const clearQuestionBtn = document.getElementById('clearQuestion');
const copyResultBtn = document.getElementById('copyResult');
const clearResultBtn = document.getElementById('clearResult');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');
const toggleLangBtn = document.getElementById('btnToggleLang');

const STORAGE_KEY = 'geminiHomeworkSolver';

let isPasswordVisible = false;

document.addEventListener('DOMContentLoaded', () => {
  init().catch(error => {
    console.error('Init error', error);
    setStatus('Không thể tải cấu hình.', 'error');
  });
});

async function init() {
  bindEvents();
  await loadSettings();
  await populateSelection();
}

function bindEvents() {
  toggleApiKey.addEventListener('click', () => {
    isPasswordVisible = !isPasswordVisible;
    apiKeyInput.type = isPasswordVisible ? 'text' : 'password';
  });

  saveApiKeyBtn.addEventListener('click', () => {
    saveSettings({ apiKey: apiKeyInput.value.trim() })
      .then(() => setStatus('Đã lưu API key.', 'success'))
      .catch(error => setStatus(error.message || 'Lỗi lưu API key.', 'error'));
  });

  outputModeSelect.addEventListener('change', () => {
    const isCustom = outputModeSelect.value === 'custom';
    customPromptSection.hidden = !isCustom;
  });

  toggleLangBtn.addEventListener('click', () => {
    const current = langSelect.value;
    langSelect.value = current === 'vi' ? 'en' : 'vi';
  });

  refreshSelectionBtn.addEventListener('click', populateSelection);
  clearQuestionBtn.addEventListener('click', () => {
    questionInput.value = '';
  });

  solveButton.addEventListener('click', onSolveClick);
  copyResultBtn.addEventListener('click', handleCopyResult);
  clearResultBtn.addEventListener('click', () => {
    resultSection.hidden = true;
    resultOutput.textContent = '';
  });

  apiKeyInput.addEventListener('change', () => {
    if (!apiKeyInput.value.trim()) {
      setStatus('Chưa có API key', 'warning');
    }
  });
}

async function loadSettings() {
  const stored = await new Promise(resolve => {
    chrome.storage.sync.get(STORAGE_KEY, data => resolve(data[STORAGE_KEY] || {}));
  });

  if (stored.apiKey) {
    apiKeyInput.value = stored.apiKey;
    setStatus('Sẵn sàng', 'success');
  } else {
    setStatus('Chưa có API key', 'warning');
  }

  modelSelect.value = stored.model || modelSelect.value;
  subjectSelect.value = stored.subject || subjectSelect.value;
  outputModeSelect.value = stored.outputMode || outputModeSelect.value;
  langSelect.value = stored.lang || langSelect.value;
  cacheToggle.checked = stored.cacheEnabled ?? true;
  bypassRateLimitToggle.checked = stored.bypassRateLimit ?? false;
  customPromptInput.value = stored.customPrompt || '';
  customPromptSection.hidden = outputModeSelect.value !== 'custom';
}

async function saveSettings(partial) {
  const next = {
    apiKey: apiKeyInput.value.trim(),
    model: modelSelect.value,
    subject: subjectSelect.value,
    outputMode: outputModeSelect.value,
    lang: langSelect.value,
    cacheEnabled: cacheToggle.checked,
    bypassRateLimit: bypassRateLimitToggle.checked,
    customPrompt: customPromptInput.value.trim(),
    ...partial
  };

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: next }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve();
      }
    });
  });
}

async function populateSelection() {
  const selection = await getCurrentSelection();
  if (selection) {
    questionInput.value = selection;
  }
}

async function getCurrentSelection() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    return '';
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_SELECTION' });
    return response?.selection?.trim() || '';
  } catch (error) {
    console.warn('Không thể lấy vùng chọn:', error);
    return '';
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function onSolveClick() {
  const question = questionInput.value.trim();
  if (!question) {
    setStatus('Chưa có nội dung câu hỏi.', 'error');
    return;
  }

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus('Vui lòng nhập API key.', 'error');
    return;
  }

  await saveSettings({});

  const prompt = buildPrompt(question);
  if (!prompt) {
    return;
  }

  const cacheKey = await hashString(`${question}|${modelSelect.value}|${outputModeSelect.value}|${langSelect.value}|${subjectSelect.value}|${customPromptInput.value.trim()}`);

  setLoading(true);
  setStatus('Đang gửi đến Gemini...', 'warning');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SOLVE_WITH_GEMINI',
      payload: {
        apiKey,
        model: modelSelect.value,
        promptParts: [{ text: prompt }],
        cacheKey,
        useCache: cacheToggle.checked,
        bypassRateLimit: bypassRateLimitToggle.checked
      }
    });

    if (!response?.ok) {
      if (response?.rateLimited) {
        setStatus(`Đang bị giới hạn. Thử lại sau ${response.retryAfter}s.`, 'warning');
      } else {
        throw new Error(response?.error || 'Lỗi không xác định.');
      }
      return;
    }

    resultSection.hidden = false;
    resultOutput.textContent = response.data;

    if (response.fromCache) {
      setStatus('Trả lời từ bộ nhớ đệm.', 'success');
    } else {
      setStatus('Đã nhận phản hồi từ Gemini.', 'success');
    }
  } catch (error) {
    console.error('Solve error', error);
    setStatus(error.message || 'Lỗi gửi yêu cầu Gemini.', 'error');
  } finally {
    setLoading(false);
  }
}

function buildPrompt(question) {
  const mode = outputModeSelect.value;
  const subject = subjectSelect.value;
  const lang = langSelect.value;
  const langName = lang === 'vi' ? 'Tiếng Việt' : 'English';

  if (mode === 'custom') {
    const customText = customPromptInput.value.trim();
    if (!customText) {
      setStatus('Vui lòng nhập yêu cầu tùy chỉnh.', 'error');
      return null;
    }
    return `${customText}\n\nNội dung bài tập:\n${question}\n\nHãy trả lời bằng ${langName}.`;
  }

  if (mode === 'answer') {
    return `Bạn là trợ giảng môn ${subject}. Chỉ đưa ra đáp án cuối cùng bằng ${langName}, không giải thích, không dùng Markdown.\n\nBài tập:\n${question}`;
  }

  return `Bạn là gia sư môn ${subject}. Hãy phân tích bài tập sau theo từng bước, làm rõ giả thiết, công thức, và đưa ra kết luận cuối cùng. Trả lời bằng ${langName}.\n\nBài tập:\n${question}`;
}

async function handleCopyResult() {
  const text = resultOutput.textContent.trim();
  if (!text) {
    setStatus('Không có dữ liệu để copy.', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus('Đã copy kết quả.', 'success');
  } catch (error) {
    console.error('Copy error', error);
    setStatus('Không thể copy vào clipboard.', 'error');
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    solveButton.classList.add('is-loading');
    solveButton.disabled = true;
  } else {
    solveButton.classList.remove('is-loading');
    solveButton.disabled = false;
  }
}

function setStatus(message, tone = 'success') {
  statusText.textContent = message;
  statusText.classList.remove('success', 'error', 'warning');
  statusText.classList.add(tone);
}

async function hashString(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
