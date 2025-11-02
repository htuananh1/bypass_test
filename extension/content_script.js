(() => {
  if (window.__AI_GBT_INITIALIZED__) {
    return;
  }
  window.__AI_GBT_INITIALIZED__ = true;

  const api = typeof chrome !== 'undefined' ? chrome : browser;
  const STORAGE_NAMESPACE = 'ai_gbt';
  const STORAGE_KEYS = {
    apiKey: `${STORAGE_NAMESPACE}_api_key`,
    model: `${STORAGE_NAMESPACE}_model`,
    language: `${STORAGE_NAMESPACE}_lang`,
    subject: `${STORAGE_NAMESPACE}_subject`,
    output: `${STORAGE_NAMESPACE}_output`,
    prompt: `${STORAGE_NAMESPACE}_prompt`,
    stealth: `${STORAGE_NAMESPACE}_stealth`,
    panel: `${STORAGE_NAMESPACE}_panel`
  };

  const DEFAULTS = {
    model: 'gemini-flash-latest',
    language: 'vi',
    subject: 'Toán',
    output: 'answer',
    prompt: '',
    stealth: true,
    panel: { x: 20, y: 20 }
  };

  const MAX_SELECTION = 1200;
  const SELECTION_COOLDOWN = 1200;
  const LONG_PRESS_DURATION = 600;
  const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  const state = {
    apiKey: '',
    model: DEFAULTS.model,
    language: DEFAULTS.language,
    subject: DEFAULTS.subject,
    outputMode: DEFAULTS.output,
    customPrompt: DEFAULTS.prompt,
    stealth: DEFAULTS.stealth,
    panelPosition: { ...DEFAULTS.panel },
    panelVisible: false,
    panelDragging: false,
    isPointerInsidePanel: false,
    selectionTimer: null,
    lastSelection: '',
    lastSelectionTime: 0,
    html2CanvasReady: false,
    overlayActive: false,
    longPressTimer: null,
    sending: false
  };

  let shadowHost;
  let shadowRoot;
  let rootContainer;
  let toggleButton;
  let panel;
  let header;
  let statusText;
  let apiKeyInput;
  let apiKeySaveBtn;
  let changeKeyBtn;
  let modelSelect;
  let languageSelect;
  let subjectSelect;
  let outputSelect;
  let customPromptRow;
  let customPromptInput;
  let screenshotBtn;
  let fullScreenshotBtn;
  let toggleTextBtn;
  let textSection;
  let textArea;
  let sendTextBtn;
  let imageBox;
  let answerBox;
  let overlay;
  let selectionBox;

  init().catch((error) => {
    console.error('[AI Giải Bài Tập] Không thể khởi tạo:', error);
  });

  async function init() {
    await loadStoredState();
    buildInterface();
    attachGlobalListeners();
    applyPanelPosition();
    setPanelVisibility(!state.stealth);
    await ensureHtml2Canvas();
    if (state.apiKey) {
      scheduleKeyValidation(state.apiKey);
    }
  }

  async function loadStoredState() {
    const keys = Object.values(STORAGE_KEYS);
    const stored = await storageGet(keys);
    state.apiKey = stored[STORAGE_KEYS.apiKey] || '';
    state.model = stored[STORAGE_KEYS.model] || DEFAULTS.model;
    state.language = stored[STORAGE_KEYS.language] || DEFAULTS.language;
    state.subject = stored[STORAGE_KEYS.subject] || DEFAULTS.subject;
    state.outputMode = stored[STORAGE_KEYS.output] || DEFAULTS.output;
    state.customPrompt = stored[STORAGE_KEYS.prompt] || DEFAULTS.prompt;
    state.stealth = stored[STORAGE_KEYS.stealth] !== undefined ? stored[STORAGE_KEYS.stealth] : DEFAULTS.stealth;
    const panelData = stored[STORAGE_KEYS.panel];
    if (panelData && typeof panelData.x === 'number' && typeof panelData.y === 'number') {
      state.panelPosition = { x: panelData.x, y: panelData.y };
    }
  }

  function buildInterface() {
    shadowHost = document.createElement('div');
    shadowHost.style.all = 'initial';
    shadowHost.style.position = 'fixed';
    shadowHost.style.zIndex = '2147483646';
    shadowHost.style.inset = 'auto auto auto auto';
    document.documentElement.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = getStyles();

    rootContainer = document.createElement('div');
    rootContainer.className = 'ai-root';

    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'ai-toggle';
    toggleButton.textContent = '◆';
    toggleButton.setAttribute('aria-label', 'AI Giải Bài Tập');

    panel = document.createElement('div');
    panel.className = 'ai-panel';

    buildPanelContent(panel);

    rootContainer.append(toggleButton, panel);
    shadowRoot.append(style, rootContainer);

    toggleButton.addEventListener('click', () => {
      if (state.panelVisible) {
        setPanelVisibility(false);
      } else {
        setPanelVisibility(true);
      }
    });

    toggleButton.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') {
        state.longPressTimer = window.setTimeout(() => {
          state.stealth = !state.stealth;
          saveValue(STORAGE_KEYS.stealth, state.stealth);
          toggleButton.classList.toggle('ai-toggle-stealth', state.stealth);
          setPanelVisibility(!state.stealth);
        }, LONG_PRESS_DURATION);
      }
    });

    toggleButton.addEventListener('pointerup', clearLongPressTimer);
    toggleButton.addEventListener('pointerleave', clearLongPressTimer);

    toggleButton.classList.toggle('ai-toggle-stealth', state.stealth);
  }

  function buildPanelContent(container) {
    header = document.createElement('div');
    header.className = 'ai-header';

    const title = document.createElement('span');
    title.className = 'ai-title';
    title.textContent = 'AI Giải Bài Tập';

    statusText = document.createElement('span');
    statusText.className = 'ai-status';
    statusText.textContent = state.apiKey ? 'Sẵn sàng' : 'Nhập API key';

    header.append(title, statusText);
    container.appendChild(header);

    const keyRow = document.createElement('div');
    keyRow.className = 'ai-row';

    apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'API key Gemini';
    apiKeyInput.value = state.apiKey;
    apiKeyInput.autocomplete = 'off';
    apiKeyInput.spellcheck = false;

    apiKeySaveBtn = document.createElement('button');
    apiKeySaveBtn.type = 'button';
    apiKeySaveBtn.textContent = 'Lưu';

    changeKeyBtn = document.createElement('button');
    changeKeyBtn.type = 'button';
    changeKeyBtn.textContent = 'Sửa';

    keyRow.append(apiKeyInput, apiKeySaveBtn, changeKeyBtn);
    container.appendChild(keyRow);

    const selectRow = document.createElement('div');
    selectRow.className = 'ai-row';

    modelSelect = document.createElement('select');
    appendOptions(modelSelect, [
      ['gemini-flash-latest', '⚡ Flash'],
      ['gemini-2.0-flash', '⚡ Flash 2.0'],
      ['gemini-2.0-pro-exp-02-05', '✨ Pro']
    ], state.model);

    languageSelect = document.createElement('select');
    appendOptions(languageSelect, [
      ['vi', 'VI'],
      ['en', 'EN']
    ], state.language);

    subjectSelect = document.createElement('select');
    appendOptions(subjectSelect, [
      ['Toán', 'Toán'],
      ['Lý', 'Lý'],
      ['Hóa', 'Hóa'],
      ['Sinh', 'Sinh'],
      ['Văn', 'Văn'],
      ['Anh', 'Anh'],
      ['Sử', 'Sử'],
      ['Địa', 'Địa'],
      ['GDCD', 'GDCD'],
      ['Tin học', 'Tin học']
    ], state.subject);

    selectRow.append(modelSelect, languageSelect, subjectSelect);
    container.appendChild(selectRow);

    const outputRow = document.createElement('div');
    outputRow.className = 'ai-row';

    outputSelect = document.createElement('select');
    appendOptions(outputSelect, [
      ['answer', 'Chỉ đáp án'],
      ['explain', 'Giải thích chi tiết'],
      ['custom', 'Tùy chỉnh']
    ], state.outputMode);

    outputRow.appendChild(outputSelect);
    container.appendChild(outputRow);

    customPromptRow = document.createElement('div');
    customPromptRow.className = 'ai-row';
    customPromptRow.style.display = state.outputMode === 'custom' ? 'flex' : 'none';

    customPromptInput = document.createElement('textarea');
    customPromptInput.rows = 2;
    customPromptInput.placeholder = 'Nhập yêu cầu tùy chỉnh...';
    customPromptInput.value = state.customPrompt;
    customPromptRow.appendChild(customPromptInput);
    container.appendChild(customPromptRow);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'ai-row ai-actions';

    screenshotBtn = document.createElement('button');
    screenshotBtn.type = 'button';
    screenshotBtn.textContent = '📐 Vùng';

    fullScreenshotBtn = document.createElement('button');
    fullScreenshotBtn.type = 'button';
    fullScreenshotBtn.textContent = '📄 Trang';

    toggleTextBtn = document.createElement('button');
    toggleTextBtn.type = 'button';
    toggleTextBtn.textContent = '📝 Văn bản';

    actionsRow.append(screenshotBtn, fullScreenshotBtn, toggleTextBtn);
    container.appendChild(actionsRow);

    textSection = document.createElement('div');
    textSection.className = 'ai-text';
    textSection.style.display = 'none';

    textArea = document.createElement('textarea');
    textArea.rows = 3;
    textArea.placeholder = 'Nhập câu hỏi hoặc dán nội dung...';
    textArea.addEventListener('input', refreshActionState);

    sendTextBtn = document.createElement('button');
    sendTextBtn.type = 'button';
    sendTextBtn.textContent = 'Gửi Gemini';

    textSection.append(textArea, sendTextBtn);
    container.appendChild(textSection);

    imageBox = document.createElement('div');
    imageBox.className = 'ai-box ai-image';

    answerBox = document.createElement('div');
    answerBox.className = 'ai-box ai-answer';
    answerBox.textContent = 'Chưa có nội dung.';

    container.append(imageBox, answerBox);

    header.addEventListener('pointerdown', beginDragPanel);
    document.addEventListener('pointermove', handleDragPanel, { passive: true });
    document.addEventListener('pointerup', endDragPanel, { passive: true });

    apiKeySaveBtn.addEventListener('click', () => {
      const value = apiKeyInput.value.trim();
      if (!value) {
        updateStatus('API key không được để trống', 'error');
        return;
      }
      state.apiKey = value;
      saveValue(STORAGE_KEYS.apiKey, state.apiKey);
      apiKeyInput.blur();
      scheduleKeyValidation(state.apiKey);
      refreshActionState();
    });

    changeKeyBtn.addEventListener('click', () => {
      apiKeyInput.focus();
      apiKeyInput.select();
      updateStatus('Nhập API key mới', 'info');
    });

    modelSelect.addEventListener('change', () => {
      state.model = modelSelect.value;
      saveValue(STORAGE_KEYS.model, state.model);
    });

    languageSelect.addEventListener('change', () => {
      state.language = languageSelect.value;
      saveValue(STORAGE_KEYS.language, state.language);
    });

    subjectSelect.addEventListener('change', () => {
      state.subject = subjectSelect.value;
      saveValue(STORAGE_KEYS.subject, state.subject);
    });

    outputSelect.addEventListener('change', () => {
      state.outputMode = outputSelect.value;
      customPromptRow.style.display = state.outputMode === 'custom' ? 'flex' : 'none';
      saveValue(STORAGE_KEYS.output, state.outputMode);
    });

    customPromptInput.addEventListener('input', () => {
      state.customPrompt = customPromptInput.value;
      saveValue(STORAGE_KEYS.prompt, state.customPrompt);
    });

    toggleTextBtn.addEventListener('click', () => {
      const visible = textSection.style.display === 'block';
      textSection.style.display = visible ? 'none' : 'block';
      if (!visible) {
        textArea.focus();
      }
      refreshActionState();
    });

    sendTextBtn.addEventListener('click', () => {
      const text = textArea.value.trim();
      if (!text) {
        updateStatus('Vui lòng nhập nội dung văn bản.', 'error');
        return;
      }
      submitTextQuestion(text);
    });

    screenshotBtn.addEventListener('click', () => startRegionCapture());
    fullScreenshotBtn.addEventListener('click', () => captureFullPage());

    panel.addEventListener('pointerenter', () => {
      state.isPointerInsidePanel = true;
    });
    panel.addEventListener('pointerleave', () => {
      state.isPointerInsidePanel = false;
    });

    refreshActionState();
  }

  function attachGlobalListeners() {
    document.addEventListener('selectionchange', () => {
      if (state.isPointerInsidePanel || state.overlayActive) {
        return;
      }
      scheduleSelectionProcessing();
    });

    document.addEventListener('pointerdown', (event) => {
      if (isEventInsidePanel(event)) {
        state.isPointerInsidePanel = true;
      }
    }, true);

    document.addEventListener('pointerup', () => {
      state.isPointerInsidePanel = false;
    }, true);

    window.addEventListener('resize', clampPanelPosition, { passive: true });
    window.addEventListener('orientationchange', () => {
      setTimeout(clampPanelPosition, 300);
    });
  }

  function isEventInsidePanel(event) {
    if (!shadowHost) {
      return false;
    }
    const path = event.composedPath ? event.composedPath() : [];
    return path.includes(shadowHost);
  }

  function scheduleSelectionProcessing() {
    if (state.selectionTimer) {
      clearTimeout(state.selectionTimer);
    }
    state.selectionTimer = window.setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text) {
        return;
      }
      if (text.length > MAX_SELECTION) {
        updateStatus('Vùng bôi đen quá dài, hãy chọn ít hơn.', 'error');
        return;
      }
      const now = Date.now();
      if (text === state.lastSelection && now - state.lastSelectionTime < SELECTION_COOLDOWN) {
        return;
      }
      state.lastSelection = text;
      state.lastSelectionTime = now;
      selection.removeAllRanges();
      openTextModeWithContent(text);
      submitTextQuestion(text);
    }, 250);
  }

  function openTextModeWithContent(text) {
    setPanelVisibility(true);
    textSection.style.display = 'block';
    textArea.value = text;
    try {
      textArea.focus({ preventScroll: false });
    } catch (error) {
      textArea.focus();
    }
    refreshActionState();
  }

  function scheduleKeyValidation(key) {
    updateStatus('Đang kiểm tra API key...', 'info');
    callBackground('validate-key', { apiKey: key, model: state.model })
      .then(() => {
        updateStatus('API key hợp lệ', 'success');
      })
      .catch((error) => {
        updateStatus(error?.message || 'API key không hợp lệ.', 'error');
      });
  }

  function submitTextQuestion(text) {
    if (!text) {
      return;
    }
    if (!state.apiKey) {
      updateStatus('Vui lòng nhập API key trước.', 'error');
      return;
    }
    const prompt = buildPrompt(text, false);
    if (!prompt) {
      return;
    }
    sendPrompt({ prompt });
  }

  async function captureFullPage() {
    if (state.overlayActive || state.sending) {
      return;
    }
    await ensureHtml2Canvas();
    const restore = hidePanelForCapture();
    try {
      let dataUrl = '';
      try {
        const tabCapture = await callBackground('capture-visible-tab');
        if (tabCapture?.ok && tabCapture.dataUrl) {
          dataUrl = tabCapture.dataUrl;
        }
      } catch (error) {
        // ignore and fall back to html2canvas
      }

      if (!dataUrl) {
        const canvas = await window.html2canvas(document.body, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight
        });
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      }

      if (!dataUrl) {
        throw new Error('Không thể chụp màn hình.');
      }

      const base64 = dataUrl.split(',')[1];
      processImageResult(dataUrl, base64);
    } catch (error) {
      updateStatus('Không thể chụp màn hình: ' + (error?.message || error), 'error');
    } finally {
      restore();
    }
  }

  async function startRegionCapture() {
    if (state.overlayActive || state.sending) {
      return;
    }
    await ensureHtml2Canvas();
    const restore = hidePanelForCapture();
    state.overlayActive = true;

    overlay = overlay || createOverlay();
    selectionBox = selectionBox || createSelectionBox();
    document.body.append(overlay, selectionBox);

    let startX = 0;
    let startY = 0;
    let active = false;

    const handlePointerDown = (event) => {
      active = true;
      startX = event.clientX;
      startY = event.clientY;
      updateSelectionBox(startX, startY, startX, startY);
      overlay.style.display = 'block';
      selectionBox.style.display = 'block';
    };

    const handlePointerMove = (event) => {
      if (!active) {
        return;
      }
      updateSelectionBox(startX, startY, event.clientX, event.clientY);
    };

    const handlePointerUp = async (event) => {
      if (!active) {
        return;
      }
      active = false;
      overlay.removeEventListener('pointerdown', handlePointerDown);
      overlay.removeEventListener('pointermove', handlePointerMove);
      overlay.removeEventListener('pointerup', handlePointerUp);
      overlay.style.display = 'none';
      selectionBox.style.display = 'none';
      const endX = event.clientX;
      const endY = event.clientY;
      const bounds = getBounds(startX, startY, endX, endY);
      if (bounds.width < 10 || bounds.height < 10) {
        restore();
        state.overlayActive = false;
        return;
      }
      try {
        const canvas = await window.html2canvas(document.body, {
          x: bounds.left + window.scrollX,
          y: bounds.top + window.scrollY,
          width: bounds.width,
          height: bounds.height,
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1];
        processImageResult(dataUrl, base64);
      } catch (error) {
        updateStatus('Không thể chụp vùng đã chọn: ' + (error?.message || error), 'error');
      } finally {
        restore();
        state.overlayActive = false;
      }
    };

    overlay.addEventListener('pointerdown', handlePointerDown, { passive: true });
    overlay.addEventListener('pointermove', handlePointerMove, { passive: true });
    overlay.addEventListener('pointerup', handlePointerUp, { passive: true });
  }

  function processImageResult(dataUrl, base64) {
    if (!base64) {
      updateStatus('Không đọc được ảnh đã chụp.', 'error');
      return;
    }
    imageBox.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    imageBox.appendChild(img);
    sendPrompt({ prompt: buildPrompt('', true), image: base64 });
  }

  function hidePanelForCapture() {
    const previouslyVisible = state.panelVisible;
    setPanelVisibility(false, true);
    return () => {
      if (previouslyVisible) {
        setPanelVisibility(true);
      }
    };
  }

  async function sendPrompt({ prompt, image }) {
    if (!state.apiKey) {
      updateStatus('Vui lòng nhập API key trước.', 'error');
      return;
    }
    if (!prompt) {
      updateStatus('Thiếu nội dung yêu cầu.', 'error');
      return;
    }
    state.sending = true;
    answerBox.textContent = '⏳ Đang gửi tới Gemini...';
    updateStatus('Đang xử lý...', 'info');
    refreshActionState();
    try {
      const response = await callBackground('gemini-request', {
        payload: {
          apiKey: state.apiKey,
          model: state.model,
          prompt,
          imageData: image || null
        }
      });
      if (!response?.ok) {
        const err = response?.error;
        const message = err?.message || err?.detail || 'Yêu cầu thất bại';
        throw new Error(message);
      }
      renderAnswer(response.text || '');
      updateStatus('Hoàn thành', 'success');
    } catch (error) {
      const message = error?.message || error?.detail || 'Không thể xử lý yêu cầu.';
      answerBox.textContent = message;
      updateStatus(message, 'error');
    } finally {
      state.sending = false;
      refreshActionState();
    }
  }

  function renderAnswer(text) {
    if (!text) {
      answerBox.textContent = 'Không có dữ liệu trả về.';
      return;
    }
    answerBox.textContent = '';
    const lines = text.split('\n');
    lines.forEach((line) => {
      const div = document.createElement('div');
      div.textContent = line;
      answerBox.appendChild(div);
    });
  }

  function buildPrompt(input, isImage) {
    const languageLabel = state.language === 'vi' ? 'Tiếng Việt' : 'English';
    if (state.outputMode === 'custom') {
      const custom = state.customPrompt.trim();
      if (!custom) {
        updateStatus('Vui lòng nhập yêu cầu tùy chỉnh.', 'error');
        return '';
      }
      return `${custom} (Trả lời bằng ${languageLabel}).`;
    }
    const source = isImage ? 'trong ảnh đã gửi' : 'được cung cấp';
    const contentHint = input
      ? `Nội dung: ${input}`
      : isImage
      ? 'Hãy đọc và xử lý trực tiếp từ ảnh đính kèm.'
      : '';
    if (state.outputMode === 'answer') {
      if (!input && !isImage) {
        updateStatus('Không có nội dung để xử lý.', 'error');
        return '';
      }
      return `Cho bài tập môn ${state.subject} ${source}, chỉ đưa ra đáp án cuối cùng, không giải thích, trả lời bằng ${languageLabel}. ${contentHint}`.trim();
    }
    const explainPrompt = `Phân tích và giải chi tiết bài tập môn ${state.subject} ${source}. Trình bày từng bước rõ ràng và trả lời bằng ${languageLabel}. ${contentHint}`.trim();
    return explainPrompt;
  }

  function beginDragPanel(event) {
    state.panelDragging = true;
    panel.classList.add('ai-dragging');
    panel.setPointerCapture(event.pointerId);
    state.dragOffset = {
      x: event.clientX - state.panelPosition.x,
      y: event.clientY - state.panelPosition.y
    };
  }

  function handleDragPanel(event) {
    if (!state.panelDragging) {
      return;
    }
    const nextX = event.clientX - (state.dragOffset?.x || 0);
    const nextY = event.clientY - (state.dragOffset?.y || 0);
    state.panelPosition = clampPosition(nextX, nextY);
    applyPanelPosition();
  }

  function endDragPanel(event) {
    if (!state.panelDragging) {
      return;
    }
    panel.releasePointerCapture(event.pointerId);
    state.panelDragging = false;
    panel.classList.remove('ai-dragging');
    saveValue(STORAGE_KEYS.panel, state.panelPosition);
  }

  function clampPanelPosition() {
    state.panelPosition = clampPosition(state.panelPosition.x, state.panelPosition.y);
    applyPanelPosition();
    saveValue(STORAGE_KEYS.panel, state.panelPosition);
  }

  function clampPosition(x, y) {
    const padding = 12;
    const maxX = window.innerWidth - panel.offsetWidth - padding;
    const maxY = window.innerHeight - panel.offsetHeight - padding;
    const minX = padding;
    const minY = padding + getSafeAreaInset('top');
    return {
      x: Math.min(Math.max(x, minX), Math.max(maxX, minX)),
      y: Math.min(Math.max(y, minY), Math.max(maxY, minY))
    };
  }

  function applyPanelPosition() {
    panel.style.transform = `translate(${state.panelPosition.x}px, ${state.panelPosition.y}px)`;
  }

  function setPanelVisibility(visible, force) {
    if (!force && visible === state.panelVisible) {
      return;
    }
    state.panelVisible = visible;
    panel.classList.toggle('ai-visible', visible);
    if (!visible) {
      window.setTimeout(() => {
        if (!state.panelVisible) {
          textSection.style.display = 'none';
        }
      }, 200);
    }
  }

  function clearLongPressTimer() {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }

  function updateStatus(message, mode) {
    statusText.textContent = message;
    statusText.classList.remove('ai-status-success', 'ai-status-error', 'ai-status-info');
    if (mode === 'success') {
      statusText.classList.add('ai-status-success');
    } else if (mode === 'error') {
      statusText.classList.add('ai-status-error');
    } else {
      statusText.classList.add('ai-status-info');
    }
  }

  function refreshActionState() {
    if (!screenshotBtn || !fullScreenshotBtn || !sendTextBtn || !toggleTextBtn || !textArea) {
      return;
    }
    const ready = Boolean(state.apiKey);
    const busy = state.sending;
    screenshotBtn.disabled = !ready || busy;
    fullScreenshotBtn.disabled = !ready || busy;
    toggleTextBtn.disabled = busy;
    const hasText = textArea.value.trim().length > 0;
    sendTextBtn.disabled = !ready || busy || !hasText;
  }

  async function ensureHtml2Canvas() {
    if (state.html2CanvasReady) {
      return;
    }
    if (window.html2canvas) {
      state.html2CanvasReady = true;
      return;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HTML2CANVAS_URL;
      script.async = true;
      script.onload = () => {
        state.html2CanvasReady = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Không tải được html2canvas.'));
      document.documentElement.appendChild(script);
    });
  }

  function createOverlay() {
    const el = document.createElement('div');
    el.className = 'ai-overlay';
    el.style.display = 'none';
    return el;
  }

  function createSelectionBox() {
    const el = document.createElement('div');
    el.className = 'ai-selection-box';
    el.style.display = 'none';
    return el;
  }

  function updateSelectionBox(x1, y1, x2, y2) {
    const bounds = getBounds(x1, y1, x2, y2);
    selectionBox.style.left = `${bounds.left}px`;
    selectionBox.style.top = `${bounds.top}px`;
    selectionBox.style.width = `${bounds.width}px`;
    selectionBox.style.height = `${bounds.height}px`;
  }

  function getBounds(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);
    return { left, top, width, height };
  }

  function appendOptions(select, entries, selected) {
    entries.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (value === selected) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  async function callBackground(action, payload = {}) {
    return new Promise((resolve, reject) => {
      api.runtime.sendMessage({ action, ...payload }, (response) => {
        const err = api.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(response);
      });
    });
  }

  async function storageGet(keys) {
    return new Promise((resolve) => {
      api.storage.local.get(keys, (items) => {
        resolve(items || {});
      });
    });
  }

  function saveValue(key, value) {
    api.storage.local.set({ [key]: value });
  }

  function getSafeAreaInset(position) {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;${position}:env(safe-area-inset-${position},0px);pointer-events:none;opacity:0;`;
    document.body.appendChild(div);
    const computed = parseInt(getComputedStyle(div).getPropertyValue(position) || '0', 10);
    document.body.removeChild(div);
    return Number.isFinite(computed) ? computed : 0;
  }

  function getStyles() {
    return `
      :host {
        all: initial;
      }
      .ai-root {
        position: fixed;
        inset: auto auto auto auto;
      }
      .ai-toggle {
        pointer-events: auto;
        position: fixed;
        right: calc(16px + env(safe-area-inset-right, 0px));
        bottom: calc(18px + env(safe-area-inset-bottom, 0px));
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(30, 30, 30, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #f4f4f4;
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.2s ease, opacity 0.2s ease;
        z-index: 2147483645;
      }
      .ai-toggle:active {
        transform: scale(0.92);
      }
      .ai-toggle-stealth {
        opacity: 0.2;
      }
      .ai-panel {
        position: fixed;
        top: 0;
        left: 0;
        transform: translate(20px, 20px);
        width: min(320px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        display: none;
        flex-direction: column;
        gap: 8px;
        background: rgba(20, 20, 20, 0.95);
        color: #f3f3f3;
        border-radius: 14px;
        padding: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 18px 30px rgba(0, 0, 0, 0.35);
        font-family: 'Segoe UI', system-ui, sans-serif;
        pointer-events: auto;
        overflow: hidden;
      }
      .ai-panel.ai-visible {
        display: flex;
      }
      .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        cursor: grab;
        user-select: none;
      }
      .ai-panel.ai-dragging .ai-header {
        cursor: grabbing;
      }
      .ai-title {
        font-size: 14px;
        font-weight: 600;
      }
      .ai-status {
        font-size: 11px;
        opacity: 0.9;
      }
      .ai-status-success { color: #2ecc71; }
      .ai-status-error { color: #e74c3c; }
      .ai-status-info { color: #f1c40f; }
      .ai-row {
        display: flex;
        gap: 6px;
        width: 100%;
      }
      .ai-row input,
      .ai-row select,
      .ai-row textarea,
      .ai-row button {
        flex: 1;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
        padding: 8px 10px;
        font-size: 12px;
        font-family: inherit;
      }
      .ai-row button {
        cursor: pointer;
        background: rgba(46, 204, 113, 0.15);
        border-color: rgba(46, 204, 113, 0.35);
      }
      .ai-row button:hover {
        background: rgba(46, 204, 113, 0.25);
      }
      .ai-row button:active {
        transform: scale(0.98);
      }
      .ai-row textarea {
        resize: vertical;
        min-height: 56px;
      }
      .ai-actions button {
        flex: 1;
        background: rgba(52, 152, 219, 0.18);
        border-color: rgba(52, 152, 219, 0.35);
      }
      .ai-actions button:nth-child(2) {
        background: rgba(155, 89, 182, 0.18);
        border-color: rgba(155, 89, 182, 0.35);
      }
      .ai-actions button:nth-child(3) {
        background: rgba(241, 196, 15, 0.18);
        border-color: rgba(241, 196, 15, 0.35);
      }
      .ai-text {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ai-text button {
        align-self: stretch;
        background: rgba(46, 204, 113, 0.25);
        border-color: rgba(46, 204, 113, 0.45);
      }
      .ai-box {
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 10px;
        background: rgba(0, 0, 0, 0.25);
        max-height: 160px;
        overflow: auto;
        font-size: 12px;
        line-height: 1.4;
      }
      .ai-box::-webkit-scrollbar {
        width: 6px;
      }
      .ai-box::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 999px;
      }
      .ai-image img {
        width: 100%;
        border-radius: 8px;
      }
      .ai-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 2147483644;
        touch-action: none;
        cursor: crosshair;
      }
      .ai-selection-box {
        position: fixed;
        border: 2px dashed rgba(46, 204, 113, 0.9);
        background: rgba(46, 204, 113, 0.2);
        border-radius: 10px;
        pointer-events: none;
        z-index: 2147483645;
      }
      @media (max-width: 480px) {
        .ai-panel {
          width: calc(100vw - 24px);
          padding: 16px;
          gap: 10px;
        }
        .ai-row {
          flex-direction: column;
        }
        .ai-row button,
        .ai-row input,
        .ai-row select,
        .ai-row textarea {
          width: 100%;
        }
      }
    `;
  }
})();
