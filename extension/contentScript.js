const BACKEND_URL = 'http://localhost:8000/solve';
const SNAP_MARGIN = 16;
const STORAGE_KEYS = {
  lastSelection: 'lastSelection',
  widgetCorner: 'widgetCorner'
};

if (!window.__aiGatewayInjected) {
  window.__aiGatewayInjected = true;

  const state = {
    dragging: false,
    dragOffset: { x: 0, y: 0 },
    currentCorner: 'bottom-right',
    panel: null,
    widget: null,
    selectionTimeout: null
  };

  const cornerPositions = {
    'top-left': { top: SNAP_MARGIN, left: SNAP_MARGIN },
    'top-right': { top: SNAP_MARGIN, right: SNAP_MARGIN },
    'bottom-left': { bottom: SNAP_MARGIN, left: SNAP_MARGIN },
    'bottom-right': { bottom: SNAP_MARGIN, right: SNAP_MARGIN }
  };

  const getSelectionText = () => {
    const selection = window.getSelection();
    if (!selection) return '';
    return selection.toString().trim();
  };

  const persistSelection = (text) => {
    if (!text) return;
    chrome.storage.local.set({
      [STORAGE_KEYS.lastSelection]: {
        text,
        url: window.location.href,
        updatedAt: Date.now()
      }
    });
  };

  const scheduleSelectionPersist = () => {
    clearTimeout(state.selectionTimeout);
    state.selectionTimeout = setTimeout(() => {
      const text = getSelectionText();
      if (text) {
        persistSelection(text);
      }
    }, 120);
  };

  document.addEventListener('selectionchange', scheduleSelectionPersist);
  document.addEventListener('mouseup', scheduleSelectionPersist);
  document.addEventListener('keyup', scheduleSelectionPersist);

  const createWidget = () => {
    if (document.getElementById('ai-gateway-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'ai-gateway-widget';
    widget.textContent = 'AI';

    widget.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      state.dragging = true;
      widget.classList.add('dragging');
      const rect = widget.getBoundingClientRect();
      state.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      widget.style.transition = 'none';
    });

    document.addEventListener('mousemove', (event) => {
      if (!state.dragging) return;
      const x = event.clientX - state.dragOffset.x;
      const y = event.clientY - state.dragOffset.y;
      widget.style.left = `${x}px`;
      widget.style.top = `${y}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!state.dragging) return;
      state.dragging = false;
      widget.classList.remove('dragging');
      widget.style.transition = '';
      snapWidget(widget);
    });

    widget.addEventListener('click', (event) => {
      if (state.dragging) {
        event.preventDefault();
        return;
      }
      togglePanel();
    });

    state.widget = widget;
    document.body.appendChild(widget);
    applyCorner(widget, state.currentCorner);
  };

  const resetAnchorProperties = (element) => {
    element.style.top = 'auto';
    element.style.bottom = 'auto';
    element.style.left = 'auto';
    element.style.right = 'auto';
  };

  const applyCorner = (element, corner) => {
    resetAnchorProperties(element);
    const position = cornerPositions[corner] || cornerPositions['bottom-right'];

    if (Object.prototype.hasOwnProperty.call(position, 'top')) {
      element.style.top = `${position.top}px`;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'bottom')) {
      element.style.bottom = `${position.bottom}px`;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'left')) {
      element.style.left = `${position.left}px`;
    }
    if (Object.prototype.hasOwnProperty.call(position, 'right')) {
      element.style.right = `${position.right}px`;
    }

    state.currentCorner = corner;
    chrome.storage.local.set({ [STORAGE_KEYS.widgetCorner]: corner });
  };

  const snapWidget = (element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const distances = {
      'top-left': Math.hypot(centerX, centerY),
      'top-right': Math.hypot(width - centerX, centerY),
      'bottom-left': Math.hypot(centerX, height - centerY),
      'bottom-right': Math.hypot(width - centerX, height - centerY)
    };

    const nearest = Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
    applyCorner(element, nearest);
  };

  const togglePanel = (prefillText) => {
    if (state.panel) {
      closePanel();
    } else {
      openPanel(prefillText);
    }
  };

  const closePanel = () => {
    if (!state.panel) return;
    state.panel.remove();
    state.panel = null;
  };

  const openPanel = (prefillText = '') => {
    if (state.panel) return;

    const panel = document.createElement('div');
    panel.id = 'ai-gateway-panel';

    panel.innerHTML = `
      <header>
        <span>AI Gateway</span>
        <button class="close" title="Đóng">×</button>
      </header>
      <label>Question / Bài tập</label>
      <textarea class="question" placeholder="Dán bài tập cần giải..."></textarea>
      <label>Context (optional)</label>
      <textarea class="context" placeholder="Thông tin thêm (nếu có)"></textarea>
      <label>Model</label>
      <select class="model">
        <option value="openai/gpt-5" selected>openai/gpt-5</option>
        <option value="openai/gpt-5-codex">openai/gpt-5-codex</option>
        <option value="openai/gpt-oss-120b">openai/gpt-oss-120b</option>
        <option value="anthropic/claude-sonnet-4.5">anthropic/claude-sonnet-4.5</option>
        <option value="anthropic/claude-haiku-4.5">anthropic/claude-haiku-4.5</option>
        <option value="google/gemini-2.5-flash">google/gemini-2.5-flash</option>
        <option value="google/gemini-2.5-pro">google/gemini-2.5-pro</option>
        <option value="deepseek/deepseek-v3.2-exp">deepseek/deepseek-v3.2-exp</option>
      </select>
      <button class="solve">Solve / Giải bài tập</button>
      <p class="status"></p>
      <div class="result hidden">
        <h4>Answer</h4>
        <pre class="answer"></pre>
        <div class="explanation hidden">
          <h4>Explanation</h4>
          <pre class="explanation-text"></pre>
        </div>
      </div>
    `;

    const closeBtn = panel.querySelector('button.close');
    const questionField = panel.querySelector('textarea.question');
    const contextField = panel.querySelector('textarea.context');
    const modelSelect = panel.querySelector('select.model');
    const solveBtn = panel.querySelector('button.solve');
    const statusEl = panel.querySelector('.status');
    const resultBox = panel.querySelector('.result');
    const answerEl = panel.querySelector('.answer');
    const explanationBox = panel.querySelector('.explanation');
    const explanationText = panel.querySelector('.explanation-text');

    closeBtn.addEventListener('click', closePanel);

    const fillQuestion = async () => {
      const stored = await chrome.storage.local.get(['lastSelection', 'lastModel']);
      if (prefillText) {
        questionField.value = prefillText;
      } else if (stored.lastSelection?.text) {
        questionField.value = stored.lastSelection.text;
      }
      if (stored.lastModel && [...modelSelect.options].some((opt) => opt.value === stored.lastModel)) {
        modelSelect.value = stored.lastModel;
      }
    };

    fillQuestion();

    const setLoading = (loading) => {
      solveBtn.disabled = loading;
      solveBtn.textContent = loading ? 'Đang xử lý...' : 'Solve / Giải bài tập';
      statusEl.textContent = loading ? 'Đang gọi backend qua AI Gateway...' : '';
    };

    const renderResult = (data) => {
      if (!data) {
        resultBox.classList.add('hidden');
        return;
      }
      resultBox.classList.remove('hidden');
      answerEl.textContent = data.answer || '';
      if (data.explanation) {
        explanationBox.classList.remove('hidden');
        explanationText.textContent = data.explanation;
      } else {
        explanationBox.classList.add('hidden');
        explanationText.textContent = '';
      }
    };

    solveBtn.addEventListener('click', async () => {
      const question = questionField.value.trim();
      const context = contextField.value.trim();
      const model = modelSelect.value;

      if (!question) {
        statusEl.textContent = 'Vui lòng nhập câu hỏi.';
        return;
      }

      setLoading(true);
      renderResult(null);

      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            context: context || null,
            model
          })
        });

        if (!response.ok) {
          throw new Error(`Backend trả về lỗi ${response.status}`);
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || 'Backend không xử lý được yêu cầu.');
        }

        chrome.storage.local.set({ lastModel: model });
        statusEl.textContent = 'Hoàn tất.';
        renderResult(data);
      } catch (error) {
        console.error(error);
        statusEl.textContent = error.message || 'Có lỗi xảy ra.';
      } finally {
        setLoading(false);
      }
    });

    document.body.appendChild(panel);
    state.panel = panel;
    positionPanelNearWidget(panel);
  };

  const positionPanelNearWidget = (panel) => {
    if (!state.widget) return;
    const rect = state.widget.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    let top = rect.bottom + 12;
    let left = rect.left;

    if (rect.right + panelRect.width > window.innerWidth) {
      left = window.innerWidth - panelRect.width - SNAP_MARGIN;
    }

    if (top + panelRect.height > window.innerHeight) {
      top = rect.top - panelRect.height - 12;
    }

    panel.style.top = `${Math.max(SNAP_MARGIN, top)}px`;
    panel.style.left = `${Math.max(SNAP_MARGIN, left)}px`;
  };

  window.addEventListener('resize', () => {
    if (state.widget) {
      applyCorner(state.widget, state.currentCorner);
    }
    if (state.panel) {
      positionPanelNearWidget(state.panel);
    }
  });

  chrome.storage.local.get([STORAGE_KEYS.widgetCorner]).then((data) => {
    if (data[STORAGE_KEYS.widgetCorner]) {
      state.currentCorner = data[STORAGE_KEYS.widgetCorner];
    }
    createWidget();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'OPEN_WIDGET_PANEL') {
      if (!state.panel) {
        openPanel(message.text || '');
      } else if (message.text) {
        const questionField = state.panel.querySelector('textarea.question');
        if (questionField) {
          questionField.value = message.text;
        }
      }
    }
  });
}
