(() => {
  if (window.__aiHomeworkInjected) return;
  window.__aiHomeworkInjected = true;

  const extensionApi = typeof chrome !== 'undefined' ? chrome : browser;
  const storageArea = extensionApi?.storage?.sync || extensionApi?.storage?.local;

  const DEFAULT_MODEL = 'gemini-flash-latest';
  const STORAGE_KEYS = {
    apiKey: 'aiGeminiApiKey',
    model: 'aiGeminiModel',
    lang: 'aiGeminiLang',
    subject: 'aiGeminiSubject',
    mode: 'aiGeminiOutputMode',
    custom: 'aiGeminiCustomPrompt',
    panel: 'aiGeminiPanelPosition'
  };

  const subjects = ['Toán', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'Văn', 'Anh', 'GDCD', 'Tin học'];
  const models = [
    { value: 'gemini-flash-latest', label: '⚡️ Flash' },
    { value: 'gemini-2.5-pro', label: '✨ Pro 2.5' }
  ];

  const ui = buildUI();
  const state = {
    selecting: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    hideTimeout: null,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };

  init();

  function init() {
    attachEventHandlers();
    restoreSettings();
    updateCustomPromptVisibility();
    setStatus('Vui lòng nhập API key', '#e74c3c');
  }

  function buildUI() {
    const panel = document.createElement('div');
    panel.id = 'aiPanel';
    panel.innerHTML = `
      <div class="ai-header" data-draggable="true">
        <h2>Trần Bảo Ngọc</h2>
        <div id="aiStatus">Ready</div>
      </div>
      <div id="apiKeySection">
        <label>API Key Gemini</label>
        <input type="password" id="apiKeyInput" placeholder="Nhập API key của bạn..." />
      </div>
      <button id="changeApiBtn" style="display:none; width: 100%; margin-bottom: 8px;">Thay đổi Key</button>
      <div class="ai-selects">
        <select id="modelSelect"></select>
        <select id="langSelect"><option value="vi">VI</option><option value="en">EN</option></select>
        <select id="subjectSelect"></select>
      </div>
      <div class="ai-selects">
        <select id="outputMode" style="width:100%">
          <option value="answer">Chỉ đáp án</option>
          <option value="explain">Giải thích chi tiết</option>
          <option value="custom">Tùy chỉnh...</option>
        </select>
      </div>
      <div id="customPromptSection" style="display:none; margin-bottom: 8px;">
        <label>Yêu cầu tùy chỉnh</label>
        <textarea id="customPromptInput" rows="3" placeholder="Ví dụ: Tóm tắt nội dung trong ảnh..."></textarea>
      </div>
      <div class="ai-actions">
        <button id="btnShot" disabled>📸 Kéo vùng</button>
        <button id="btnFullPage" disabled>📄 Toàn trang</button>
      </div>
      <button id="btnToggleTextMode" class="text-mode-btn" disabled>📝 Nhập câu hỏi</button>
      <div id="textInputSection" style="display: none; margin-top: 8px;">
        <label>Nhập câu hỏi của bạn vào đây</label>
        <textarea id="textQuestionInput" rows="4" placeholder="Ví dụ: Trình bày vai trò của quang hợp..."></textarea>
        <button id="btnSendTextQuestion" style="width:100%; margin-top: 4px;">Gửi câu hỏi</button>
      </div>
      <div class="ai-box">
        <label>Ảnh</label>
        <div id="imgBox"></div>
      </div>
      <div class="ai-box">
        <label>Đáp án</label>
        <div id="ansBox"></div>
      </div>
    `;

    document.body.appendChild(panel);

    const toggle = document.createElement('button');
    toggle.id = 'aiPanelToggle';
    toggle.type = 'button';
    toggle.textContent = 'AI';
    document.body.appendChild(toggle);

    const overlay = document.createElement('div');
    overlay.id = 'aiSnipOverlay';
    document.body.appendChild(overlay);

    const snipBox = document.createElement('div');
    snipBox.id = 'aiSnipBox';
    document.body.appendChild(snipBox);

    injectStyles();

    const modelSelect = panel.querySelector('#modelSelect');
    models.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      modelSelect.appendChild(option);
    });

    const subjectSelect = panel.querySelector('#subjectSelect');
    subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });

    return {
      panel,
      toggle,
      overlay,
      snipBox,
      status: panel.querySelector('#aiStatus'),
      apiKeyInput: panel.querySelector('#apiKeyInput'),
      apiKeySection: panel.querySelector('#apiKeySection'),
      changeApiBtn: panel.querySelector('#changeApiBtn'),
      modelSelect,
      langSelect: panel.querySelector('#langSelect'),
      subjectSelect,
      outputMode: panel.querySelector('#outputMode'),
      customPromptSection: panel.querySelector('#customPromptSection'),
      customPromptInput: panel.querySelector('#customPromptInput'),
      btnShot: panel.querySelector('#btnShot'),
      btnFullPage: panel.querySelector('#btnFullPage'),
      btnToggleTextMode: panel.querySelector('#btnToggleTextMode'),
      textInputSection: panel.querySelector('#textInputSection'),
      textQuestionInput: panel.querySelector('#textQuestionInput'),
      btnSendTextQuestion: panel.querySelector('#btnSendTextQuestion'),
      imgBox: panel.querySelector('#imgBox'),
      ansBox: panel.querySelector('#ansBox')
    };
  }

  function injectStyles() {
    if (document.getElementById('aiPanelStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiPanelStyles';
    style.textContent = `
#aiPanel {
  position: fixed;
  top: 30px;
  left: 30px;
  width: 280px;
  background: rgba(30, 30, 30, 0.95);
  color: #fff;
  z-index: 2147483640;
  padding: 12px;
  border-radius: 12px;
  font-family: 'Segoe UI', sans-serif;
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
  display: none;
  cursor: default;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
}

#aiPanel.show {
  display: block;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding-bottom: 8px;
  user-select: none;
}

.ai-header h2 {
  margin: 0;
  font-size: 14px;
  color: #00b894;
}

#aiStatus {
  font-size: 10px;
  color: #aaa;
  min-height: 12px;
  text-align: right;
}

#aiPanel label {
  display: block;
  font-size: 11px;
  color: #ccc;
  margin-bottom: 4px;
}

#aiPanel input,
#aiPanel textarea,
#aiPanel select,
#aiPanel button {
  font-family: inherit;
}

#aiPanel input,
#aiPanel textarea,
#aiPanel select {
  width: 100%;
  box-sizing: border-box;
  padding: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(20,20,20,0.9);
  color: #fff;
}

#aiPanel input:focus,
#aiPanel textarea:focus,
#aiPanel select:focus {
  outline: none;
  border-color: #00b894;
  box-shadow: 0 0 0 1px rgba(0,184,148,0.4);
}

.ai-selects,
.ai-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

#aiPanel button {
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #2a2a2a;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}

#aiPanel button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-actions button {
  background: linear-gradient(135deg, #00b894, #009975);
}

.ai-actions button:hover:not(:disabled) {
  background: linear-gradient(135deg, #00c5a0, #00a07f);
}

#btnToggleTextMode {
  width: 100%;
  background: linear-gradient(135deg, #e67e22, #d35400);
  margin-bottom: 4px;
}

#btnToggleTextMode:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff9d42, #e86a00);
}

#btnSendTextQuestion {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

#btnSendTextQuestion:hover:not(:disabled) {
  background: linear-gradient(135deg, #4ca9e5, #2c82c9);
}

.ai-box {
  margin-bottom: 8px;
}

.ai-box div {
  min-height: 40px;
  background: rgba(20,20,20,0.85);
  padding: 8px;
  border-radius: 6px;
  font-size: 11px;
  white-space: pre-wrap;
  word-wrap: break-word;
  border: 1px solid rgba(255,255,255,0.08);
}

#imgBox img {
  max-width: 100%;
  border-radius: 6px;
}

#ansBox.loading::after {
  content: '⏳';
  display: inline-block;
  margin-left: 6px;
  animation: ai-spin 1s linear infinite;
}

@keyframes ai-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

#aiSnipOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 2147483646;
  display: none;
  cursor: crosshair;
  touch-action: none;
}

#aiSnipBox {
  position: fixed;
  border: 2px dashed #00b894;
  background: rgba(0,184,148,0.15);
  z-index: 2147483647;
  display: none;
  pointer-events: none;
  border-radius: 6px;
}

#aiPanelToggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #00b894, #009975);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  z-index: 2147483641;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
}

#aiPanelToggle:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0,184,148,0.35);
}

@media (max-width: 480px) {
  #aiPanel {
    width: calc(100vw - 32px);
    left: 16px;
    right: 16px;
    top: 16px;
  }

  #aiPanelToggle {
    width: 52px;
    height: 52px;
    bottom: 16px;
    right: 16px;
  }
}
    `;
    document.head.appendChild(style);
  }

  function attachEventHandlers() {
    ui.apiKeyInput.addEventListener('blur', handleApiKeyBlur);
    ui.changeApiBtn.addEventListener('click', enableApiEditing);
    ui.btnShot.addEventListener('click', startSelectionMode);
    ui.btnFullPage.addEventListener('click', () => captureFullPage());
    ui.btnToggleTextMode.addEventListener('click', toggleTextMode);
    ui.btnSendTextQuestion.addEventListener('click', sendTextQuestion);
    ui.outputMode.addEventListener('change', () => {
      updateCustomPromptVisibility();
      saveSetting(STORAGE_KEYS.mode, ui.outputMode.value);
    });
    ui.modelSelect.addEventListener('change', () => saveSetting(STORAGE_KEYS.model, ui.modelSelect.value));
    ui.langSelect.addEventListener('change', () => saveSetting(STORAGE_KEYS.lang, ui.langSelect.value));
    ui.subjectSelect.addEventListener('change', () => saveSetting(STORAGE_KEYS.subject, ui.subjectSelect.value));
    ui.customPromptInput.addEventListener('input', () => saveSetting(STORAGE_KEYS.custom, ui.customPromptInput.value));
    ui.toggle.addEventListener('click', togglePanelVisibility);

    document.addEventListener('keydown', (event) => {
      if (event.code === 'ShiftRight') {
        togglePanelVisibility();
      }
    });

    ui.overlay.addEventListener('pointerdown', handlePointerDown);
    ui.overlay.addEventListener('pointermove', handlePointerMove);
    ui.overlay.addEventListener('pointerup', handlePointerUp);
    ui.overlay.addEventListener('pointercancel', handlePointerCancel);

    ui.panel.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-draggable="true"]')) {
        state.dragging = true;
        state.pointerId = event.pointerId;
        state.dragOffsetX = event.clientX - ui.panel.offsetLeft;
        state.dragOffsetY = event.clientY - ui.panel.offsetTop;
        ui.panel.setPointerCapture(event.pointerId);
      }
    });

    ui.panel.addEventListener('pointermove', (event) => {
      if (!state.dragging || state.pointerId !== event.pointerId) return;
      const newLeft = event.clientX - state.dragOffsetX;
      const newTop = event.clientY - state.dragOffsetY;
      ui.panel.style.left = `${Math.max(8, Math.min(window.innerWidth - ui.panel.offsetWidth - 8, newLeft))}px`;
      ui.panel.style.top = `${Math.max(8, Math.min(window.innerHeight - ui.panel.offsetHeight - 8, newTop))}px`;
    });

    ui.panel.addEventListener('pointerup', (event) => {
      if (state.dragging && state.pointerId === event.pointerId) {
        state.dragging = false;
        state.pointerId = null;
        ui.panel.releasePointerCapture(event.pointerId);
        saveSetting(STORAGE_KEYS.panel, {
          left: ui.panel.style.left,
          top: ui.panel.style.top
        });
      }
    });

    ui.panel.addEventListener('pointercancel', resetDragging);
  }

  function resetDragging(event) {
    if (state.dragging && state.pointerId === event.pointerId) {
      state.dragging = false;
      state.pointerId = null;
      try {
        ui.panel.releasePointerCapture(event.pointerId);
      } catch (error) {
        // ignore
      }
    }
  }

  async function restoreSettings() {
    const data = await getStorage(Object.values(STORAGE_KEYS));
    if (data[STORAGE_KEYS.apiKey]) {
      ui.apiKeyInput.value = data[STORAGE_KEYS.apiKey];
      setStatus('Đang kiểm tra key...', '#f1c40f');
      await checkApiKey();
    }
    if (data[STORAGE_KEYS.model]) {
      ui.modelSelect.value = data[STORAGE_KEYS.model];
    }
    if (data[STORAGE_KEYS.lang]) {
      ui.langSelect.value = data[STORAGE_KEYS.lang];
    }
    if (data[STORAGE_KEYS.subject]) {
      ui.subjectSelect.value = data[STORAGE_KEYS.subject];
    }
    if (data[STORAGE_KEYS.mode]) {
      ui.outputMode.value = data[STORAGE_KEYS.mode];
    }
    if (data[STORAGE_KEYS.custom]) {
      ui.customPromptInput.value = data[STORAGE_KEYS.custom];
    }
    if (data[STORAGE_KEYS.panel] && typeof data[STORAGE_KEYS.panel] === 'object') {
      if (data[STORAGE_KEYS.panel].left) ui.panel.style.left = data[STORAGE_KEYS.panel].left;
      if (data[STORAGE_KEYS.panel].top) ui.panel.style.top = data[STORAGE_KEYS.panel].top;
    }
  }

  function handleApiKeyBlur() {
    saveSetting(STORAGE_KEYS.apiKey, ui.apiKeyInput.value.trim());
    checkApiKey();
  }

  function enableApiEditing() {
    ui.apiKeySection.style.display = 'block';
    ui.changeApiBtn.style.display = 'none';
    ui.apiKeyInput.value = '';
    ui.apiKeyInput.focus();
    setActionButtonsEnabled(false);
    setStatus('Nhập key mới rồi chạm ra ngoài.', '#f1c40f');
  }

  function togglePanelVisibility() {
    const willShow = !ui.panel.classList.contains('show');
    ui.panel.classList.toggle('show', willShow);
    ui.panel.style.display = willShow ? 'block' : 'none';
    if (willShow) {
      checkApiKey(true);
    }
  }

  function toggleTextMode() {
    const visible = ui.textInputSection.style.display === 'block';
    ui.textInputSection.style.display = visible ? 'none' : 'block';
  }

  function startSelectionMode() {
    state.selecting = true;
    ui.overlay.style.display = 'block';
    ui.snipBox.style.display = 'none';
    hideInterface();
  }

  function handlePointerDown(event) {
    if (!state.selecting) return;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.endX = event.clientX;
    state.endY = event.clientY;
    ui.overlay.setPointerCapture(event.pointerId);
    updateSnipBox();
  }

  function handlePointerMove(event) {
    if (!state.selecting || state.pointerId !== event.pointerId) return;
    state.endX = event.clientX;
    state.endY = event.clientY;
    updateSnipBox();
  }

  function handlePointerUp(event) {
    if (!state.selecting || state.pointerId !== event.pointerId) return;
    finalizeSelection();
    ui.overlay.releasePointerCapture(event.pointerId);
  }

  function handlePointerCancel(event) {
    if (!state.selecting || state.pointerId !== event.pointerId) return;
    cancelSelection();
  }

  function updateSnipBox() {
    const left = Math.min(state.startX, state.endX);
    const top = Math.min(state.startY, state.endY);
    const width = Math.abs(state.endX - state.startX);
    const height = Math.abs(state.endY - state.startY);

    ui.snipBox.style.display = 'block';
    ui.snipBox.style.left = `${left}px`;
    ui.snipBox.style.top = `${top}px`;
    ui.snipBox.style.width = `${width}px`;
    ui.snipBox.style.height = `${height}px`;
  }

  async function finalizeSelection() {
    state.selecting = false;
    ui.overlay.style.display = 'none';
    ui.snipBox.style.display = 'none';

    const width = Math.abs(state.endX - state.startX);
    const height = Math.abs(state.endY - state.startY);

    if (width < 10 || height < 10) {
      showInterface();
      return;
    }

    const cropOptions = {
      x: Math.min(state.startX, state.endX),
      y: Math.min(state.startY, state.endY),
      width,
      height
    };

    await captureRegion(cropOptions);
  }

  function cancelSelection() {
    state.selecting = false;
    ui.overlay.style.display = 'none';
    ui.snipBox.style.display = 'none';
    showInterface();
  }

  async function captureRegion(region) {
    ui.imgBox.innerHTML = '🕐 Đang chụp ảnh...';
    ui.ansBox.textContent = '';
    try {
      const screenshot = await requestScreenshot();
      const base64 = await cropImage(screenshot, region);
      ui.imgBox.innerHTML = `<img src="data:image/jpeg;base64,${base64}" alt="Đoạn chụp" />`;
      const prompt = createPrompt(true);
      if (prompt) {
        await sendToGemini(prompt, base64);
      }
    } catch (error) {
      ui.imgBox.innerHTML = `<b style="color:red;">❌ ${error.message || 'Lỗi chụp ảnh.'}</b>`;
    } finally {
      showInterface();
    }
  }

  async function captureFullPage() {
    hideInterface();
    ui.imgBox.innerHTML = '🕐 Đang chụp ảnh...';
    ui.ansBox.textContent = '';
    try {
      const screenshot = await requestScreenshot();
      const base64 = screenshot.split(',')[1];
      ui.imgBox.innerHTML = `<img src="${screenshot}" alt="Ảnh chụp" />`;
      const prompt = createPrompt(true);
      if (prompt) {
        await sendToGemini(prompt, base64);
      }
    } catch (error) {
      ui.imgBox.innerHTML = `<b style="color:red;">❌ ${error.message || 'Lỗi chụp ảnh.'}</b>`;
    } finally {
      showInterface();
    }
  }

  function hideInterface() {
    ui.panel.style.display = 'none';
    ui.toggle.style.display = 'none';
  }

  function showInterface() {
    ui.panel.style.display = ui.panel.classList.contains('show') ? 'block' : 'none';
    ui.toggle.style.display = 'inline-block';
  }

  async function requestScreenshot() {
    return new Promise((resolve, reject) => {
      extensionApi.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
        const err = extensionApi.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error?.message || 'Không thể chụp màn hình.'));
          return;
        }
        resolve(response.dataUrl);
      });
    });
  }

  function cropImage(dataUrl, region) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scaleX = image.naturalWidth / window.innerWidth;
        const scaleY = image.naturalHeight / window.innerHeight;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(region.width * scaleX));
        canvas.height = Math.max(1, Math.round(region.height * scaleY));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          image,
          Math.round(region.x * scaleX),
          Math.round(region.y * scaleY),
          Math.round(region.width * scaleX),
          Math.round(region.height * scaleY),
          0,
          0,
          canvas.width,
          canvas.height
        );
        resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      };
      image.onerror = () => reject(new Error('Không thể xử lý ảnh đã chụp.'));
      image.src = dataUrl;
    });
  }

  function createPrompt(isImage) {
    const lang = ui.langSelect.value === 'vi' ? 'Tiếng Việt' : 'English';
    const subj = ui.subjectSelect.value;
    const mode = ui.outputMode.value;
    const source = isImage ? 'trong ảnh' : 'được cung cấp';

    if (mode === 'custom') {
      const customText = ui.customPromptInput.value.trim();
      if (!customText) {
        ui.ansBox.innerHTML = '<b style="color:red;">Lỗi:</b> Vui lòng nhập yêu cầu tùy chỉnh.';
        return null;
      }
      return `${customText} (Trả lời bằng ${lang})`;
    }

    if (mode === 'answer') {
      return `Với bài tập môn ${subj} ${source}, chỉ đưa ra đáp án cuối cùng. Không giải thích. Không dùng markdown. Trả lời bằng ${lang}.`;
    }

    return `Phân tích và giải chi tiết bài tập môn ${subj} ${source}. Suy nghĩ từng bước, đưa ra công thức và lời giải rõ ràng. Trả lời bằng ${lang}.`;
  }

  function setActionButtonsEnabled(enabled) {
    ui.btnShot.disabled = !enabled;
    ui.btnFullPage.disabled = !enabled;
    ui.btnToggleTextMode.disabled = !enabled;
  }

  async function checkApiKey(skipStatus) {
    const key = ui.apiKeyInput.value.trim();
    if (!key) {
      setActionButtonsEnabled(false);
      setStatus('Vui lòng nhập API key', '#e74c3c');
      ui.apiKeySection.style.display = 'block';
      ui.changeApiBtn.style.display = 'none';
      return;
    }

    if (!skipStatus) {
      setStatus('🔄 Đang kiểm tra key...', '#f1c40f');
    }
    setActionButtonsEnabled(false);

    try {
      await sendMessage({ type: 'CHECK_API_KEY', apiKey: key, model: ui.modelSelect.value || DEFAULT_MODEL });
      setStatus('✅ Key hợp lệ', '#00b894');
      ui.apiKeySection.style.display = 'none';
      ui.changeApiBtn.style.display = 'block';
      setActionButtonsEnabled(true);
    } catch (error) {
      setStatus(`❌ ${error.message || 'Key không hợp lệ.'}`, '#e74c3c');
      ui.apiKeySection.style.display = 'block';
      ui.changeApiBtn.style.display = 'none';
    }
  }

  function setStatus(text, color) {
    ui.status.textContent = text;
    ui.status.style.color = color || '#ccc';
  }

  function updateCustomPromptVisibility() {
    ui.customPromptSection.style.display = ui.outputMode.value === 'custom' ? 'block' : 'none';
  }

  async function sendTextQuestion() {
    const question = ui.textQuestionInput.value.trim();
    if (!question) {
      ui.ansBox.innerHTML = '<b style="color:red;">Lỗi:</b> Vui lòng nhập câu hỏi.';
      return;
    }
    const prompt = createPrompt(false);
    if (!prompt) return;
    ui.imgBox.innerHTML = '';
    await sendToGemini(`Câu hỏi: "${question}".\n\n${prompt}`, null);
  }

  async function sendToGemini(prompt, base64Image) {
    const apiKey = ui.apiKeyInput.value.trim();
    if (!apiKey) {
      ui.ansBox.innerHTML = '<b style="color:red;">Lỗi:</b> Vui lòng nhập API key.';
      return;
    }

    ui.ansBox.textContent = '⏳ Đang gửi đến Gemini...';
    ui.ansBox.classList.add('loading');
    setActionButtonsEnabled(false);

    try {
      const response = await sendMessage({
        type: 'SEND_TO_GEMINI',
        payload: {
          apiKey,
          model: ui.modelSelect.value || DEFAULT_MODEL,
          prompt,
          imageData: base64Image || null
        }
      });
      ui.ansBox.classList.remove('loading');
      typeEffect(ui.ansBox, response.data || '');
      if (base64Image) {
        ui.imgBox.innerHTML = '';
      }
      setStatus('✅ Đã nhận phản hồi', '#00b894');
    } catch (error) {
      ui.ansBox.classList.remove('loading');
      ui.ansBox.innerHTML = `<b style="color:red;">Lỗi API:</b> ${error.message || 'Không thể gửi yêu cầu.'}`;
      setStatus('❌ Lỗi khi gọi Gemini', '#e74c3c');
    } finally {
      setActionButtonsEnabled(true);
    }
  }

  function typeEffect(el, text, speed = 10) {
    el.textContent = '';
    let i = 0;
    function next() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i += 1;
        setTimeout(next, speed);
      }
    }
    next();
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      extensionApi.runtime.sendMessage(message, (response) => {
        const err = extensionApi.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        if (!response || response.ok === false) {
          const msg = response?.error?.message || 'Thao tác thất bại.';
          reject(new Error(msg));
          return;
        }
        resolve(response);
      });
    });
  }

  function saveSetting(key, value) {
    if (!storageArea) return;
    storageArea.set({ [key]: value }, () => {
      // ignore errors
    });
  }

  function getStorage(keys) {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve({});
        return;
      }
      storageArea.get(keys, (result) => {
        resolve(result || {});
      });
    });
  }
})();
