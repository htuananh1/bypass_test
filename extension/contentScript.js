let latestSelection = '';

const textInputTypes = new Set(['textarea', 'text', 'search', 'url', 'email', 'number']);

function captureSelection() {
  latestSelection = readSelection();
}

function readSelection(allowFallback = false) {
  const selection = window.getSelection();
  const selected = selection ? selection.toString().trim() : '';
  if (selected) {
    return selected;
  }

  const activeElement = document.activeElement;
  if (!activeElement) {
    return '';
  }

  const tag = activeElement.tagName?.toLowerCase();
  const type = activeElement.type?.toLowerCase();

  const isEditable = activeElement.isContentEditable || tag === 'textarea' || (tag === 'input' && textInputTypes.has(type));
  if (!isEditable) {
    if (!allowFallback) {
      return '';
    }

    const textContent = (activeElement.innerText || activeElement.textContent || '').trim();
    return clipText(textContent);
  }

  const { selectionStart, selectionEnd, value = '' } = activeElement;
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number' && selectionStart !== selectionEnd) {
    return value.substring(selectionStart, selectionEnd).trim();
  }

  if (!allowFallback) {
    return '';
  }

  const trimmedValue = (value || '').trim();
  if (trimmedValue) {
    return clipText(trimmedValue);
  }

  if (activeElement.isContentEditable) {
    const textContent = (activeElement.innerText || activeElement.textContent || '').trim();
    return clipText(textContent);
  }

  return '';
}

document.addEventListener('selectionchange', captureSelection, true);
document.addEventListener('mouseup', captureSelection, true);
document.addEventListener('keyup', event => {
  if (event.key === 'Escape') {
    latestSelection = '';
  }
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_CURRENT_SELECTION') {
    const selectionText = latestSelection || readSelection(true);
    sendResponse({ selection: selectionText });
    return true;
  }

  return false;
});

function clipText(text, limit = 1500) {
  if (!text) {
    return '';
  }

  if (text.length <= limit) {
    return text;
  }

  return text.slice(0, limit);
}
