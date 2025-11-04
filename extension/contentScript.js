let latestSelection = '';

const textInputTypes = new Set(['textarea', 'text', 'search', 'url', 'email', 'number']);

function captureSelection() {
  latestSelection = readSelection();
}

function readSelection() {
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
    return '';
  }

  const { selectionStart, selectionEnd, value = '' } = activeElement;
  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number' && selectionStart !== selectionEnd) {
    return value.substring(selectionStart, selectionEnd).trim();
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
    const selectionText = latestSelection || readSelection();
    sendResponse({ selection: selectionText });
    return true;
  }

  return false;
});
