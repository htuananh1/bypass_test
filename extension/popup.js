const statusText = document.getElementById('statusText');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKey = document.getElementById('toggleApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const modelSelect = document.getElementById('modelSelect');
const outputModeSelect = document.getElementById('outputMode');
const langSelect = document.getElementById('langSelect');
const questionInput = document.getElementById('questionInput');
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
const subjectHint = document.getElementById('subjectHint');

const STORAGE_KEY = 'aiGatewayHomeworkSolver';
const GATEWAY_SNIPPET = `import os
from openai import OpenAI

client = OpenAI(
  api_key=os.getenv('AI_GATEWAY_API_KEY'),
  base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
  model='openai/gpt-oss-120b',
  messages=[
    {
      'role': 'user',
      'content': 'Why is the sky blue?'
    }
  ]
)`;
const GATEWAY_SNIPPET_BLOCK = '```python\n' + GATEWAY_SNIPPET + '\n```';

const SUBJECT_CATEGORIES = [
  {
    name: 'Toán học',
    keywords: [
      'toán',
      'phương trình',
      'hàm số',
      'giải hệ',
      'đạo hàm',
      'tích phân',
      'hình học',
      'lim',
      'equation',
      'algebra',
      'geometry',
      'integral',
      'derivative'
    ]
  },
  {
    name: 'Vật lý',
    keywords: [
      'vật lý',
      'lực',
      'gia tốc',
      'điện trường',
      'động năng',
      'cơ học',
      'quang học',
      'physics',
      'velocity',
      'energy',
      'momentum',
      'electric field'
    ]
  },
  {
    name: 'Hóa học',
    keywords: [
      'hóa học',
      'hóa trị',
      'phản ứng',
      'mol',
      'cân bằng phương trình',
      'axit',
      'bazơ',
      'chemistry',
      'molecule',
      'stoichiometry',
      'oxidation'
    ]
  },
  {
    name: 'Sinh học',
    keywords: [
      'sinh học',
      'tế bào',
      'di truyền',
      'hormone',
      'DNA',
      'RNA',
      'enzyme',
      'biology',
      'organism',
      'photosynthesis'
    ]
  },
  {
    name: 'Tin học',
    keywords: [
      'lập trình',
      'thuật toán',
      'python',
      'java',
      'c++',
      'mã giả',
      'complexity',
      'binary',
      'computer science',
      'data structure',
      'code'
    ]
  },
  {
    name: 'Ngữ văn',
    keywords: [
      'nghị luận',
      'văn học',
      'phân tích tác phẩm',
      'nhân vật',
      'thơ',
      'bài văn',
      'literature',
      'essay',
      'character analysis'
    ]
  },
  {
    name: 'Lịch sử',
    keywords: [
      'lịch sử',
      'chiến tranh',
      'triều đại',
      'cách mạng',
      'history',
      'revolution',
      'dynasty',
      'historical'
    ]
  },
  {
    name: 'Địa lý',
    keywords: [
      'địa lý',
      'khí hậu',
      'địa hình',
      'bản đồ',
      'dân số',
      'geography',
      'climate',
      'population',
      'terrain'
    ]
  },
  {
    name: 'Tiếng Anh',
    keywords: [
      'grammar',
      'dịch',
      'vocabulary',
      'rewrite the sentence',
      'english',
      'từ vựng',
      'ngữ pháp'
    ]
  }
];

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

  toggleLangBtn.addEventListener('click', () => {
    const current = langSelect.value;
    langSelect.value = current === 'vi' ? 'en' : 'vi';
  });

  refreshSelectionBtn.addEventListener('click', async () => {
    await populateSelection();
  });
  clearQuestionBtn.addEventListener('click', () => {
    questionInput.value = '';
    updateSubjectHint();
  });

  solveButton.addEventListener('click', onSolveClick);
  copyResultBtn.addEventListener('click', handleCopyResult);
  clearResultBtn.addEventListener('click', () => {
    resultSection.hidden = true;
    resultOutput.textContent = '';
  });

  questionInput.addEventListener('input', updateSubjectHint);

  apiKeyInput.addEventListener('change', () => {
    if (!apiKeyInput.value.trim()) {
      setStatus('Chưa có API key AI Gateway', 'warning');
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
    setStatus('Chưa có API key AI Gateway', 'warning');
  }

  if (stored.model && Array.from(modelSelect.options).some(option => option.value === stored.model)) {
    modelSelect.value = stored.model;
  }
  outputModeSelect.value = stored.outputMode || outputModeSelect.value;
  langSelect.value = stored.lang || langSelect.value;
  cacheToggle.checked = stored.cacheEnabled ?? true;
  bypassRateLimitToggle.checked = stored.bypassRateLimit ?? false;
}

async function saveSettings(partial) {
  const next = {
    apiKey: apiKeyInput.value.trim(),
    model: modelSelect.value,
    outputMode: outputModeSelect.value,
    lang: langSelect.value,
    cacheEnabled: cacheToggle.checked,
    bypassRateLimit: bypassRateLimitToggle.checked,
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
  updateSubjectHint();
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

  const cacheKey = await hashString(`${question}|${modelSelect.value}|${outputModeSelect.value}|${langSelect.value}`);

  setLoading(true);
  setStatus('Đang gửi đến GPT (AI Gateway)...', 'warning');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SOLVE_WITH_GPT',
      payload: {
        apiKey,
        model: modelSelect.value,
        prompt,
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
      setStatus('Đã nhận phản hồi từ GPT.', 'success');
    }
  } catch (error) {
    console.error('Solve error', error);
    setStatus(error.message || 'Lỗi gửi yêu cầu GPT.', 'error');
  } finally {
    setLoading(false);
  }
}

function buildPrompt(question) {
  const mode = outputModeSelect.value;
  const lang = langSelect.value;
  const langName = lang === 'vi' ? 'Tiếng Việt' : 'English';
  const subject = detectSubject(question);
  const subjectLine = subject ? `Môn học gợi ý: ${subject}` : 'Môn học gợi ý: Chưa xác định';

  if (mode === 'answer') {
    return `Bạn là trợ giảng AI hỗ trợ học sinh. Dựa trên gợi ý ${subjectLine.toLowerCase()}, xác nhận hoặc điều chỉnh môn học trước khi đưa ra đáp án cuối cùng bằng ${langName}.\n\nĐịnh dạng bắt buộc:\n${subjectLine}\nĐáp án: <đáp án cuối cùng bằng ${langName}>\n\nKhông thêm giải thích hoặc Markdown.\n\nBài tập:\n${question}\n\nSau phần trả lời, chèn nguyên văn đoạn mã Python sau để học sinh tái sử dụng GPT qua AI Gateway:\n\n${GATEWAY_SNIPPET_BLOCK}`;
  }

  return `Bạn là gia sư AI thông minh. ${subjectLine}. Nếu cần hãy điều chỉnh tên môn học cho chính xác rồi phân tích bài tập theo từng bước, giải thích rõ giả thiết, công thức và đưa ra kết luận bằng ${langName}.\n\nBài tập:\n${question}\n\nKết thúc phần giải thích bằng việc chèn nguyên văn đoạn mã Python sau để học sinh tái sử dụng GPT qua AI Gateway:\n\n${GATEWAY_SNIPPET_BLOCK}`;
}

function detectSubject(rawText) {
  const text = normalizeText(rawText);
  if (!text) {
    return '';
  }

  let bestMatch = { name: '', score: 0 };

  for (const category of SUBJECT_CATEGORIES) {
    let score = 0;
    for (const keyword of category.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;
      if (text.includes(normalizedKeyword)) {
        score += normalizedKeyword.split(' ').length;
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { name: category.name, score };
    }
  }

  if (bestMatch.score === 0) {
    return '';
  }

  return bestMatch.name;
}

function normalizeText(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function updateSubjectHint() {
  if (!subjectHint) {
    return;
  }

  const question = questionInput.value.trim();
  const subject = detectSubject(question);

  if (!question) {
    subjectHint.textContent = 'Môn học gợi ý: (đang chờ văn bản)';
    subjectHint.dataset.state = 'idle';
    return;
  }

  if (!subject) {
    subjectHint.textContent = 'Môn học gợi ý: Chưa xác định rõ — AI sẽ suy luận thêm.';
    subjectHint.dataset.state = 'pending';
    return;
  }

  subjectHint.textContent = `Môn học gợi ý: ${subject}`;
  subjectHint.dataset.state = 'detected';
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
