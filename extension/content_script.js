(() => {
  if (window.__aiHomeworkInjected) return;
  window.__aiHomeworkInjected = true;

  const extensionApi = typeof chrome !== 'undefined' ? chrome : browser;
  const storageArea = extensionApi?.storage?.sync || extensionApi?.storage?.local;

  const DEFAULT_MODEL = 'gemini-flash-latest';
  const HTML2CANVAS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const STORAGE_KEYS = {
    apiKey: 'aiGeminiApiKey',
    model: 'aiGeminiModel',
    lang: 'aiGeminiLang',
    subject: 'aiGeminiSubject',
    mode: 'aiGeminiOutputMode',
    custom: 'aiGeminiCustomPrompt',
    panel: 'aiGeminiPanelPosition',
    stealth: 'aiGeminiStealthMode'
  };

  const subjects = ['Toán', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'Văn', 'Anh', 'GDCD', 'Tin học'];
  const models = [
    { value: 'gemini-flash-latest', label: '⚡️ Flash' },
    { value: 'gemini-2.5-pro', label: '✨ Pro 2.5' }
  ];

  const ui = buildUI();
  const LONG_PRESS_DURATION = 600;
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
    dragOffsetY: 0,
    panelWasVisibleBeforeHide: false,
    stealth: false,
    togglePressTimer: null,
    togglePressHandled: false,
    isMobile: isMobileViewport(),
    savedPosition: null,
    host: null,
    scrollLock: null,
    html2CanvasReady: false,
    html2CanvasLoading: null,
    hostObserver: null
  };

  init();

  function init() {
    attachEventHandlers();
    updateResponsiveMode();
    restoreSettings();
    updateCustomPromptVisibility();
    setStatus('Vui lòng nhập API key', '#e74c3c');
    applyStealthState();
  }

  function randomId(prefix = 'ai') {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildUI() {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '2147483630';
    host.style.background = 'transparent';
    host.style.border = 'none';
    host.style.margin = '0';
    host.style.padding = '0';

    const attrName = randomId('data');
    const attrValue = randomId('v');
    host.setAttribute(attrName, attrValue);

    (document.documentElement || document.body).appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'closed' });
    const container = document.createElement('div');
    container.className = 'ai-root';
    shadowRoot.appendChild(container);

    const panel = document.createElement('div');
    panel.id = 'aiPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Trợ lý Gemini');
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

    container.appendChild(panel);

    const toggle = document.createElement('button');
    toggle.id = 'aiPanelToggle';
    toggle.type = 'button';
    toggle.textContent = 'AI';
    toggle.setAttribute('aria-label', 'Mở trợ lý AI');
    toggle.setAttribute('aria-haspopup', 'dialog');
    toggle.setAttribute('aria-expanded', 'false');
    container.appendChild(toggle);

    const overlay = document.createElement('div');
    overlay.id = 'aiSnipOverlay';
    container.appendChild(overlay);

    const snipBox = document.createElement('div');
    snipBox.id = 'aiSnipBox';
    container.appendChild(snipBox);

    injectStyles(shadowRoot);

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

    state.host = host;
    monitorHost(host);

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
      ansBox: panel.querySelector('#ansBox'),
      container,
      shadowRoot
    };
  }

  function monitorHost(host) {
    if (!host) return;
    if (state.hostObserver) {
      state.hostObserver.disconnect();
    }
    const observer = new MutationObserver(() => {
      if (!document.documentElement.contains(host)) {
        observer.disconnect();
        (document.documentElement || document.body).appendChild(host);
        observer.observe(document.documentElement, { childList: true });
      }
    });
    observer.observe(document.documentElement, { childList: true });
    state.hostObserver = observer;
  }

  function injectStyles(shadowRoot) {
    if (!shadowRoot) return;
    if (shadowRoot.querySelector('style[data-ai-style="core"]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-ai-style', 'core');
    style.textContent = `
:host {
  all: initial;
}

.ai-root {
  --ai-safe-top: env(safe-area-inset-top, 0px);
  --ai-safe-right: env(safe-area-inset-right, 0px);
  --ai-safe-bottom: env(safe-area-inset-bottom, 0px);
  --ai-safe-left: env(safe-area-inset-left, 0px);
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483640;
  color: #fff;
  font-family: 'Segoe UI', sans-serif;
  font-size: 12px;
}

.ai-root *,
.ai-root *::before,
.ai-root *::after {
  box-sizing: border-box;
  font-family: inherit;
}

#aiPanel,
#aiPanelToggle {
  pointer-events: auto;
}

#aiSnipOverlay.active {
  pointer-events: auto;
}

#aiPanel {
  position: fixed;
  top: 30px;
  left: 30px;
  width: min(360px, calc(100vw - 48px));
  background: rgba(30, 30, 30, 0.95);
  color: #fff;
  z-index: 2147483640;
  padding: 14px;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
  display: none;
  cursor: default;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  max-height: min(80vh, 580px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

#aiPanel.show {
  display: block;
}

#aiPanel.stealth-hidden {
  display: none !important;
}

#aiPanel.mobile {
  top: auto;
  bottom: calc(12px + var(--ai-safe-bottom));
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: min(96vw, 420px);
  max-height: calc(82vh - var(--ai-safe-top));
  padding: calc(16px + var(--ai-safe-top)) 14px calc(18px + var(--ai-safe-bottom));
  border-radius: 20px 20px 16px 16px;
  font-size: 13px;
}

#aiPanel.mobile .ai-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

#aiPanel.mobile #aiStatus {
  text-align: left;
  font-size: 11px;
}

#aiPanel.mobile .ai-selects,
#aiPanel.mobile .ai-actions {
  flex-wrap: wrap;
}

#aiPanel.mobile .ai-selects select,
#aiPanel.mobile .ai-actions button {
  flex: 1 1 100%;
}

#aiPanel.mobile textarea {
  min-height: 84px;
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
  transition: background 0.2s ease, opacity 0.2s ease;
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

#aiPanel.mobile .ai-box div {
  font-size: 12px;
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
  pointer-events: none;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  touch-action: manipulation;
}

#aiPanelToggle:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0,184,148,0.35);
}

#aiPanelToggle:active {
  transform: scale(0.94);
}

#aiPanelToggle.mobile {
  width: 60px;
  height: 60px;
  font-size: 18px;
  bottom: calc(16px + var(--ai-safe-bottom));
  right: calc(16px + var(--ai-safe-right));
}

#aiPanelToggle.stealth {
  width: 38px;
  height: 38px;
  background: rgba(28,28,28,0.6);
  color: transparent;
  box-shadow: none;
  border: 1px solid rgba(255,255,255,0.25);
  opacity: 0.55;
}

#aiPanelToggle.stealth:hover {
  opacity: 0.75;
}

#aiPanelToggle.stealth::after {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
}

#aiPanelToggle.stealth.mobile {
  bottom: calc(20px + var(--ai-safe-bottom));
  right: calc(20px + var(--ai-safe-right));
}
    `;
    shadowRoot.appendChild(style);
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

    ui.toggle.addEventListener('pointerdown', handleTogglePointerDown);
    ui.toggle.addEventListener('pointerup', handleTogglePointerUp);
    ui.toggle.addEventListener('pointerleave', cancelTogglePress);
    ui.toggle.addEventListener('pointercancel', cancelTogglePress);
    ui.toggle.addEventListener('keydown', handleToggleKeydown);
    ui.toggle.addEventListener('contextmenu', (event) => event.preventDefault());

    document.addEventListener('keydown', (event) => {
      if (event.code === 'ShiftRight') {
        togglePanelVisibility();
      }
    });

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange);

    ui.overlay.addEventListener('pointerdown', handlePointerDown);
    ui.overlay.addEventListener('pointermove', handlePointerMove);
    ui.overlay.addEventListener('pointerup', handlePointerUp);
    ui.overlay.addEventListener('pointercancel', handlePointerCancel);

    ui.panel.addEventListener('pointerdown', (event) => {
      if (state.isMobile) return;
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
        state.savedPosition = {
          left: ui.panel.style.left,
          top: ui.panel.style.top
        };
        saveSetting(STORAGE_KEYS.panel, {
          left: ui.panel.style.left,
          top: ui.panel.style.top
        });
      }
    });

    ui.panel.addEventListener('pointercancel', resetDragging);
  }

  function handleViewportChange() {
    updateResponsiveMode();
    if (!state.isMobile && ui.panel.classList.contains('show')) {
      clampPanelPosition();
    }
  }

  function handleTogglePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cancelTogglePress();
    state.togglePressHandled = false;
    state.togglePressTimer = window.setTimeout(() => {
      state.togglePressTimer = null;
      state.togglePressHandled = true;
      toggleStealthMode();
    }, LONG_PRESS_DURATION);
  }

  function handleTogglePointerUp(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state.togglePressTimer) {
      clearTimeout(state.togglePressTimer);
      state.togglePressTimer = null;
    }
    if (state.togglePressHandled) {
      state.togglePressHandled = false;
      event.preventDefault();
      return;
    }
    event.preventDefault();
    togglePanelVisibility();
  }

  function cancelTogglePress() {
    if (state.togglePressTimer) {
      clearTimeout(state.togglePressTimer);
      state.togglePressTimer = null;
    }
    state.togglePressHandled = false;
  }

  function handleToggleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePanelVisibility();
      return;
    }
    if ((event.key === 'H' || event.key === 'h') && (event.altKey || event.metaKey)) {
      event.preventDefault();
      toggleStealthMode();
    }
  }

  function setPanelVisibility(visible, options = {}) {
    const opts = typeof options === 'object' && options ? options : {};
    const skipApiCheck = opts.skipApiCheck === true;
    const currentlyVisible = ui.panel.classList.contains('show');

    ui.panel.classList.toggle('show', visible);
    ui.panel.style.display = visible ? 'block' : 'none';
    ui.toggle.setAttribute('aria-expanded', visible ? 'true' : 'false');

    if (visible) {
      if (!skipApiCheck) {
        checkApiKey(true);
      }
      if (state.isMobile) {
        lockScroll();
        ui.panel.scrollTop = 0;
      } else {
        unlockScroll();
        if (!currentlyVisible) {
          clampPanelPosition();
        }
      }
    } else {
      unlockScroll();
    }

    applyStealthState();
  }

  function togglePanelVisibility(force) {
    const visible = ui.panel.classList.contains('show');
    const willShow = typeof force === 'boolean' ? force : !visible;
    setPanelVisibility(willShow);
  }

  function toggleStealthMode(force) {
    const next = typeof force === 'boolean' ? force : !state.stealth;
    if (next === state.stealth) return;
    const wasVisible = ui.panel.classList.contains('show');
    state.stealth = next;
    saveSetting(STORAGE_KEYS.stealth, next);
    if (next) {
      state.panelWasVisibleBeforeHide = false;
      setPanelVisibility(false, { skipApiCheck: true });
      setStatus('🔒 Đang ẩn panel', '#95a5a6');
    } else {
      setStatus('✅ Đã tắt chế độ ẩn', '#00b894');
      if (!wasVisible) {
        setPanelVisibility(true);
      } else {
        applyStealthState();
      }
      return;
    }
    applyStealthState();
  }

  function applyStealthState() {
    const shouldHidePanel = state.stealth && !ui.panel.classList.contains('show');
    ui.panel.classList.toggle('stealth-hidden', shouldHidePanel);
    ui.toggle.classList.toggle('stealth', state.stealth);
    if (state.stealth && !ui.panel.classList.contains('show')) {
      ui.toggle.textContent = '';
    } else if (!ui.toggle.textContent.trim()) {
      ui.toggle.textContent = 'AI';
    }
    ui.toggle.setAttribute(
      'aria-label',
      state.stealth ? 'Giữ để hiện trợ lý' : 'Mở trợ lý AI'
    );
    ui.toggle.title = state.stealth ? 'Giữ để hiện trợ lý' : 'AI';
  }

  function updateResponsiveMode() {
    const mobile = isMobileViewport();
    const changed = mobile !== state.isMobile;
    state.isMobile = mobile;

    ui.panel.classList.toggle('mobile', mobile);
    ui.toggle.classList.toggle('mobile', mobile);

    if (mobile) {
      if (!state.savedPosition && ui.panel.style.left && ui.panel.style.top) {
        state.savedPosition = {
          left: ui.panel.style.left,
          top: ui.panel.style.top
        };
      }
      ui.panel.style.left = '';
      ui.panel.style.top = '';
      if (ui.panel.classList.contains('show')) {
        lockScroll();
      }
    } else {
      unlockScroll();
      if (state.savedPosition) {
        if (state.savedPosition.left) ui.panel.style.left = state.savedPosition.left;
        if (state.savedPosition.top) ui.panel.style.top = state.savedPosition.top;
      } else if (!ui.panel.style.left && !ui.panel.style.top) {
        ui.panel.style.left = '30px';
        ui.panel.style.top = '30px';
      }
      if (ui.panel.classList.contains('show')) {
        clampPanelPosition();
      }
    }

    if (changed) {
      applyStealthState();
    }
  }

  function isMobileViewport() {
    return window.innerWidth <= 640 || window.innerHeight <= 520;
  }

  function clampPanelPosition() {
    if (state.isMobile) return;
    if (!ui.panel.offsetWidth || !ui.panel.offsetHeight) return;

    const rect = ui.panel.getBoundingClientRect();
    let left = parseFloat(ui.panel.style.left);
    let top = parseFloat(ui.panel.style.top);

    if (Number.isNaN(left)) {
      left = rect.left;
    }
    if (Number.isNaN(top)) {
      top = rect.top;
    }

    const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
    const maxTop = Math.max(12, window.innerHeight - rect.height - 12);

    const clampedLeft = Math.min(Math.max(12, left), maxLeft);
    const clampedTop = Math.min(Math.max(12, top), maxTop);

    ui.panel.style.left = `${clampedLeft}px`;
    ui.panel.style.top = `${clampedTop}px`;
    state.savedPosition = {
      left: ui.panel.style.left,
      top: ui.panel.style.top
    };
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
      state.savedPosition = {
        left: data[STORAGE_KEYS.panel].left || '',
        top: data[STORAGE_KEYS.panel].top || ''
      };
      if (!state.isMobile) {
        if (state.savedPosition.left) ui.panel.style.left = state.savedPosition.left;
        if (state.savedPosition.top) ui.panel.style.top = state.savedPosition.top;
      }
    }
    if (typeof data[STORAGE_KEYS.stealth] === 'boolean') {
      state.stealth = data[STORAGE_KEYS.stealth];
    }
    updateResponsiveMode();
    applyStealthState();
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

  function toggleTextMode() {
    const visible = ui.textInputSection.style.display === 'block';
    ui.textInputSection.style.display = visible ? 'none' : 'block';
  }

  function startSelectionMode() {
    state.selecting = true;
    ui.overlay.style.display = 'block';
    ui.overlay.classList.add('active');
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
    ui.overlay.classList.remove('active');
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
    ui.overlay.classList.remove('active');
    ui.snipBox.style.display = 'none';
    showInterface();
  }

  async function captureRegion(region) {
    ui.imgBox.innerHTML = '🕐 Đang chụp ảnh...';
    ui.ansBox.textContent = '';
    try {
      const result = await getScreenshot({ region });
      let base64;
      let previewUrl;
      if (result.canvas) {
        base64 = cropFromCanvas(result.canvas, region);
        previewUrl = `data:image/jpeg;base64,${base64}`;
      } else {
        base64 = await cropImage(result.dataUrl, region);
        previewUrl = `data:image/jpeg;base64,${base64}`;
      }
      ui.imgBox.innerHTML = `<img src="${previewUrl}" alt="Đoạn chụp" />`;
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
      const result = await getScreenshot();
      const dataUrl = result.dataUrl;
      const base64 = dataUrl.split(',')[1];
      ui.imgBox.innerHTML = `<img src="${dataUrl}" alt="Ảnh chụp" />`;
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

  function lockScroll() {
    if (state.scrollLock) return;
    state.scrollLock = {
      bodyOverflow: document.body.style.overflow,
      docOverflow: document.documentElement.style.overflow,
      bodyTouch: document.body.style.touchAction
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  function unlockScroll() {
    if (!state.scrollLock) return;
    document.documentElement.style.overflow = state.scrollLock.docOverflow || '';
    document.body.style.overflow = state.scrollLock.bodyOverflow || '';
    document.body.style.touchAction = state.scrollLock.bodyTouch || '';
    state.scrollLock = null;
  }

  function hideInterface() {
    state.panelWasVisibleBeforeHide = ui.panel.classList.contains('show');
    setPanelVisibility(false, { skipApiCheck: true });
    ui.toggle.style.display = 'none';
  }

  function showInterface() {
    ui.toggle.style.display = 'inline-flex';
    if (state.panelWasVisibleBeforeHide && !state.stealth) {
      setPanelVisibility(true, { skipApiCheck: true });
    }
    state.panelWasVisibleBeforeHide = false;
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

  async function getScreenshot(_options = {}) {
    try {
      const dataUrl = await requestScreenshot();
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        throw new Error('Ảnh trả về không hợp lệ.');
      }
      return { dataUrl, canvas: null };
    } catch (nativeError) {
      const fallback = await captureWithHtml2Canvas();
      if (!fallback || !fallback.dataUrl) {
        if (nativeError instanceof Error) throw nativeError;
        throw new Error('Không thể chụp màn hình.');
      }
      return { dataUrl: fallback.dataUrl, canvas: fallback.canvas, fallback: true };
    }
  }

  function cropImage(dataUrl, region) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scaleX = image.naturalWidth / window.innerWidth;
        const scaleY = image.naturalHeight / window.innerHeight;
        const sx = Math.max(0, Math.round(region.x * scaleX));
        const sy = Math.max(0, Math.round(region.y * scaleY));
        const sw = Math.min(image.naturalWidth - sx, Math.round(region.width * scaleX));
        const sh = Math.min(image.naturalHeight - sy, Math.round(region.height * scaleY));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, sw);
        canvas.height = Math.max(1, sh);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
      };
      image.onerror = () => reject(new Error('Không thể xử lý ảnh đã chụp.'));
      image.src = dataUrl;
    });
  }

  function cropFromCanvas(canvas, region) {
    if (!canvas) {
      throw new Error('Không thể xử lý ảnh đã chụp.');
    }
    const scaleX = canvas.width / window.innerWidth;
    const scaleY = canvas.height / window.innerHeight;
    const sx = Math.max(0, Math.round(region.x * scaleX));
    const sy = Math.max(0, Math.round(region.y * scaleY));
    const sw = Math.min(canvas.width - sx, Math.round(region.width * scaleX));
    const sh = Math.min(canvas.height - sy, Math.round(region.height * scaleY));
    const output = document.createElement('canvas');
    output.width = Math.max(1, sw);
    output.height = Math.max(1, sh);
    const ctx = output.getContext('2d');
    ctx.drawImage(
      canvas,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      output.width,
      output.height
    );
    return output.toDataURL('image/jpeg', 0.9).split(',')[1];
  }

  async function captureWithHtml2Canvas() {
    const html2canvas = await ensureHtml2Canvas();
    if (typeof html2canvas !== 'function') {
      throw new Error('Không thể tải công cụ chụp ảnh.');
    }
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const canvas = await html2canvas(document.body || document.documentElement, {
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      scale: dpr,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    });
    return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.9) };
  }

  async function ensureHtml2Canvas() {
    if (state.html2CanvasReady && typeof window.html2canvas === 'function') {
      return window.html2canvas;
    }
    if (state.html2CanvasLoading) {
      return state.html2CanvasLoading;
    }

    const loader = new Promise((resolve, reject) => {
      if (typeof window.html2canvas === 'function') {
        state.html2CanvasReady = true;
        resolve(window.html2canvas);
        return;
      }
      const script = document.createElement('script');
      script.src = HTML2CANVAS_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.setAttribute(randomId('data'), randomId('v'));
      script.onload = () => {
        if (typeof window.html2canvas === 'function') {
          state.html2CanvasReady = true;
          resolve(window.html2canvas);
        } else {
          reject(new Error('Không thể tải công cụ chụp ảnh.'));
        }
      };
      script.onerror = () => reject(new Error('Không thể tải công cụ chụp ảnh.'));
      (document.head || document.documentElement).appendChild(script);
    })
      .then((fn) => {
        state.html2CanvasLoading = null;
        return fn;
      })
      .catch((error) => {
        state.html2CanvasLoading = null;
        throw error;
      });

    state.html2CanvasLoading = loader;
    return loader;
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
