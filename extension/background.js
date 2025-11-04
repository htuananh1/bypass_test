chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ai-gateway-solve',
    title: 'Giải bài này bằng AI Gateway',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'ai-gateway-solve' || !tab?.id) {
    return;
  }

  const payload = {
    type: 'OPEN_WIDGET_PANEL',
    text: info.selectionText || ''
  };

  chrome.tabs.sendMessage(tab.id, payload, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to reach content script:', chrome.runtime.lastError.message);
    }
    return response;
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_LAST_SELECTION') {
    chrome.storage.local.get('lastSelection').then((result) => {
      sendResponse(result.lastSelection || null);
    });
    return true;
  }

  if (message?.type === 'OPEN_WIDGET_PANEL' && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, message);
  }
});
