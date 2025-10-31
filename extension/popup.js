const i18n = {
  vi: {
    apiKeyLabel: 'API key',
    modelLabel: 'Model',
    cacheToggle: 'Bật cache',
    saveKey: 'Lưu API key',
    scanPage: 'Quét trang',
    questionsHeading: 'Câu hỏi phát hiện',
    resultHeading: 'Kết quả',
    copyAnswer: 'Sao chép',
    noKey: 'Chưa có API key',
    ready: 'Sẵn sàng',
    limited: 'Giới hạn tạm thời'
  },
  en: {
    apiKeyLabel: 'API key',
    modelLabel: 'Model',
    cacheToggle: 'Enable cache',
    saveKey: 'Save API key',
    scanPage: 'Scan page',
    questionsHeading: 'Detected questions',
    resultHeading: 'Result',
    copyAnswer: 'Copy',
    noKey: 'No API key',
    ready: 'Ready',
    limited: 'Rate limited'
  }
};

const ui = {
  status: document.getElementById('status-indicator'),
  apiKey: document.getElementById('api-key'),
  toggleKey: document.getElementById('toggle-key'),
  model: document.getElementById('model'),
  cacheToggle: document.getElementById('cache-toggle'),
  saveKey: document.getElementById('save-key'),
  scanPage: document.getElementById('scan-page'),
  questionsList: document.getElementById('questions-list'),
  questionCount: document.getElementById('question-count'),
  copyButton: document.getElementById('copy-answer'),
  copyTooltip: document.getElementById('copy-tooltip'),
  tabs: Array.from(document.querySelectorAll('.tab')),
  panels: Array.from(document.querySelectorAll('.tab-panel')),
  summary: document.getElementById('result-summary'),
  steps: document.getElementById('result-steps'),
  answer: document.getElementById('result-answer'),
  sources: document.getElementById('result-sources'),
  themeToggle: document.getElementById('theme-toggle')
};

let currentLang = navigator.language?.startsWith('vi') ? 'vi' : 'en';
let currentQuestions = [];
let selectedQuestionId = null;
let lastSolveResult = null;
let rateLimitedUntil = 0;

init();

async function init() {
  applyTranslations();
  await loadSettings();
  bindEvents();
  await refreshQuestions();
}

function applyTranslations() {
  const strings = i18n[currentLang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (strings[key]) {
      el.textContent = strings[key];
    }
  });
  ui.copyButton.textContent = strings.copyAnswer;
}

async function loadSettings() {
  const syncData = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'geminiCacheEnabled', 'geminiTheme']);
  if (syncData.geminiApiKey) {
    ui.apiKey.value = syncData.geminiApiKey;
    setStatus('online');
  } else {
    setStatus('offline');
  }
  if (syncData.geminiModel) {
    ui.model.value = syncData.geminiModel;
  }
  if (typeof syncData.geminiCacheEnabled === 'boolean') {
    ui.cacheToggle.checked = syncData.geminiCacheEnabled;
  }
  if (syncData.geminiTheme) {
    document.documentElement.dataset.theme = syncData.geminiTheme;
  }
  const theme = document.documentElement.dataset.theme;
  ui.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

function bindEvents() {
  ui.saveKey.addEventListener('click', saveKey);
  ui.scanPage.addEventListener('click', refreshQuestions);
  ui.toggleKey.addEventListener('click', toggleKeyVisibility);
  ui.copyButton.addEventListener('click', copyAnswer);
  ui.themeToggle.addEventListener('click', toggleTheme);
  ui.apiKey.addEventListener('input', renderQuestions);
  ui.cacheToggle.addEventListener('change', () => chrome.storage.sync.set({ geminiCacheEnabled: ui.cacheToggle.checked }));
  ui.model.addEventListener('change', () => chrome.storage.sync.set({ geminiModel: ui.model.value }));

  ui.tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  });
}

async function saveKey() {
  const key = ui.apiKey.value.trim();
  await chrome.storage.sync.set({ geminiApiKey: key, geminiModel: ui.model.value, geminiCacheEnabled: ui.cacheToggle.checked });
  setStatus(key ? 'online' : 'offline');
  renderQuestions();
}

function toggleKeyVisibility() {
  const isPassword = ui.apiKey.type === 'password';
  ui.apiKey.type = isPassword ? 'text' : 'password';
  ui.toggleKey.textContent = isPassword ? '🙈' : '👁️';
}

async function refreshQuestions() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.postMessage({ type: 'HW_RESCAN' }, '*')
  });

  const questions = await executeInTab(tab.id, () => window.extractQuestions?.() || []);
  currentQuestions = questions;
  renderQuestions();
}

async function executeInTab(tabId, func) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func });
    return result || [];
  } catch (error) {
    console.warn('Failed to execute script', error);
    return [];
  }
}

function renderQuestions() {
  ui.questionsList.innerHTML = '';
  ui.questionCount.textContent = currentQuestions.length;

  if (currentQuestions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'question-item';
    empty.textContent = currentLang === 'vi' ? 'Không tìm thấy câu hỏi.' : 'No questions detected.';
    ui.questionsList.appendChild(empty);
    return;
  }

  currentQuestions.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'question-item';

    const text = document.createElement('span');
    text.className = 'question-item__text';
    text.textContent = item.text.slice(0, 90) + (item.text.length > 90 ? '…' : '');

    const solveBtn = document.createElement('button');
    solveBtn.className = 'primary';
    solveBtn.type = 'button';
    solveBtn.textContent = currentLang === 'vi' ? 'Giải' : 'Solve';
    solveBtn.disabled = !ui.apiKey.value.trim();
    solveBtn.addEventListener('click', () => solveQuestion(item));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'secondary';
    copyBtn.type = 'button';
    copyBtn.textContent = '⧉';
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(item.text));

    li.append(text, solveBtn, copyBtn);
    ui.questionsList.appendChild(li);
  });
}

async function solveQuestion(item) {
  if (!ui.apiKey.value.trim()) {
    const message = currentLang === 'vi' ? 'Vui lòng nhập API key' : 'Please enter an API key';
    setStatus('offline', message);
    return;
  }

  const now = Date.now();
  if (now < rateLimitedUntil) {
    setStatus('limited');
    return;
  }

  selectedQuestionId = item.id;
  setStatus('online', '…');

  const payload = {
    type: 'SOLVE_QUESTION',
    payload: {
      question: item.text,
      context: item.context,
      origin: item.source,
      apiKey: ui.apiKey.value.trim(),
      model: ui.model.value,
      bypassCache: !ui.cacheToggle.checked
    }
  };

  try {
    const response = await chrome.runtime.sendMessage(payload);
    if (!response?.ok) {
      handleSolveError(response?.error);
      return;
    }

    const result = response.data;
    lastSolveResult = result;
    renderResult(result);
    if (result.cached) {
      setStatus('online', 'cached');
    } else {
      setStatus('online');
      rateLimitedUntil = Date.now() + 5000;
    }
  } catch (error) {
    console.error(error);
    handleSolveError({ message: error.message });
  }
}

function handleSolveError(error) {
  if (error?.message) {
    ui.summary.textContent = error.message;
    ui.steps.innerHTML = '';
    ui.answer.textContent = '';
    ui.sources.innerHTML = '';
    ui.copyButton.disabled = true;
  }

  if (!error) {
    setStatus('offline');
    return;
  }

  switch (error.code) {
    case 'rate_limited':
      rateLimitedUntil = Date.now() + 5000;
      setStatus('limited');
      break;
    case 'auth_error':
      setStatus('offline', currentLang === 'vi' ? 'API key sai' : 'Invalid API key');
      break;
    default:
      setStatus('offline', error.message);
  }
}

function renderResult(result) {
  ui.summary.textContent = result.summary || '';
  ui.steps.innerHTML = '';
  (result.steps || []).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    ui.steps.appendChild(li);
  });
  ui.answer.textContent = result.answer || '';
  ui.sources.innerHTML = '';
  (result.sources || []).forEach((url) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = url;
    li.appendChild(link);
    ui.sources.appendChild(li);
  });

  ui.copyButton.disabled = !(result.answer && result.answer.length > 0);
}

function setStatus(state, extra = '') {
  ui.status.classList.remove('status--online', 'status--offline', 'status--limited');
  switch (state) {
    case 'online':
      ui.status.classList.add('status--online');
      ui.status.textContent = `${i18n[currentLang].ready}${extra ? ` (${extra})` : ''}`;
      break;
    case 'limited':
      ui.status.classList.add('status--limited');
      ui.status.textContent = i18n[currentLang].limited;
      break;
    default:
      ui.status.classList.add('status--offline');
      ui.status.textContent = extra || i18n[currentLang].noKey;
  }
}

function selectTab(tabId) {
  ui.tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle('tab--active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  ui.panels.forEach((panel) => {
    const active = panel.dataset.panel === tabId;
    panel.classList.toggle('tab-panel--active', active);
  });
}

async function copyAnswer() {
  if (!lastSolveResult?.answer) return;
  await navigator.clipboard.writeText(lastSolveResult.answer);
  ui.copyTooltip.hidden = false;
  setTimeout(() => {
    ui.copyTooltip.hidden = true;
  }, 1200);
}

async function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = current;
  ui.themeToggle.textContent = current === 'light' ? '🌙' : '☀️';
  await chrome.storage.sync.set({ geminiTheme: current });
}
