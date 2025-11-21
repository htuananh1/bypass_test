import { GoogleGenerativeAI } from '@google/generative-ai';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const newChatBtn = document.getElementById('newChatBtn');
const conversationsList = document.getElementById('conversationsList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const apiKeyBtn = document.getElementById('apiKeyBtn');
const apiKeyModal = document.getElementById('apiKeyModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const closeModal = document.getElementById('closeModal');
const cancelApiKey = document.getElementById('cancelApiKey');
const toast = document.getElementById('toast');

// Storage keys
const STORAGE_API_KEY = 'gemini_api_key';
const STORAGE_CONVERSATIONS = 'gemini_conversations';
const STORAGE_CURRENT_CONVERSATION = 'gemini_current_conversation_id';

// State
let apiKey = localStorage.getItem(STORAGE_API_KEY) || '';
let conversations = JSON.parse(localStorage.getItem(STORAGE_CONVERSATIONS) || '[]');
let currentConversationId = localStorage.getItem(STORAGE_CURRENT_CONVERSATION) || null;
let currentMessages = [];

// Initialize
if (apiKey) {
  apiKeyInput.value = apiKey;
}

loadConversations();
if (currentConversationId) {
  loadConversation(currentConversationId);
} else {
  showWelcomeScreen();
}

// Event Listeners
newChatBtn.addEventListener('click', createNewChat);
sidebarToggle.addEventListener('click', toggleSidebar);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('input', handleInputChange);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) {
      sendMessage();
    }
  }
});
apiKeyBtn.addEventListener('click', () => showModal());
closeModal.addEventListener('click', hideModal);
cancelApiKey.addEventListener('click', hideModal);
saveApiKeyBtn.addEventListener('click', saveApiKey);

// Auto-resize textarea
messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Handle input change
function handleInputChange() {
  sendBtn.disabled = !messageInput.value.trim();
}

// Toggle sidebar on mobile
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
}

// Show/Hide Modal
function showModal() {
  apiKeyModal.classList.add('show');
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
}

function hideModal() {
  apiKeyModal.classList.remove('show');
}

// Save API Key
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showToast('Please enter an API key', 'error');
    return;
  }
  apiKey = key;
  localStorage.setItem(STORAGE_API_KEY, key);
  hideModal();
  showToast('API key saved successfully', 'success');
}

// Create New Chat
function createNewChat() {
  currentConversationId = null;
  currentMessages = [];
  localStorage.removeItem(STORAGE_CURRENT_CONVERSATION);
  showWelcomeScreen();
  loadConversations();
}

// Load Conversations
function loadConversations() {
  conversations = JSON.parse(localStorage.getItem(STORAGE_CONVERSATIONS) || '[]');
  
  if (conversations.length === 0) {
    conversationsList.innerHTML = '<div style="padding: 12px; color: var(--text-secondary); font-size: 14px; text-align: center;">No conversations yet</div>';
    return;
  }

  conversationsList.innerHTML = conversations.map(conv => {
    const isActive = conv.id === currentConversationId;
    const item = document.createElement('div');
    item.className = `conversation-item ${isActive ? 'active' : ''}`;
    item.onclick = () => loadConversation(conv.id);
    item.innerHTML = `
      <svg class="conversation-item-icon" viewBox="0 0 16 16" fill="none">
        <path d="M2 4H14M2 8H14M2 12H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span class="conversation-item-title">${escapeHtml(conv.title)}</span>
      <button class="conversation-item-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    return item.outerHTML;
  }).join('');
}

// Load Conversation
window.loadConversation = function(id) {
  const conversation = conversations.find(c => c.id === id);
  if (!conversation) return;

  currentConversationId = id;
  currentMessages = conversation.messages || [];
  localStorage.setItem(STORAGE_CURRENT_CONVERSATION, id);
  
  renderMessages();
  loadConversations();
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
  }
};

// Delete Conversation
window.deleteConversation = function(id) {
  if (!confirm('Are you sure you want to delete this conversation?')) return;
  
  conversations = conversations.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations));
  
  if (currentConversationId === id) {
    createNewChat();
  } else {
    loadConversations();
  }
  
  showToast('Conversation deleted', 'success');
};

// Show Welcome Screen
function showWelcomeScreen() {
  chatMessages.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon">
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2"/>
          <path d="M20 32L28 40L44 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>How can I help you today?</h1>
    </div>
  `;
}

// Render Messages
function renderMessages() {
  if (currentMessages.length === 0) {
    showWelcomeScreen();
    return;
  }

  chatMessages.innerHTML = currentMessages.map((msg, index) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.role}`;
    msgDiv.innerHTML = `
      <div class="message-avatar">${msg.role === 'user' ? 'U' : 'G'}</div>
      <div class="message-content">
        <div class="message-text">${formatMessage(msg.content)}</div>
        <div class="message-actions">
          <button class="message-action-btn" data-index="${index}">Copy</button>
        </div>
      </div>
    `;
    const copyBtn = msgDiv.querySelector('.message-action-btn');
    copyBtn.onclick = () => copyMessage(msg.content);
    return msgDiv.outerHTML;
  }).join('');

  scrollToBottom();
}

// Format Message (support markdown-like formatting)
function formatMessage(text) {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
}

// Copy Message
window.copyMessage = function(text) {
  // Remove HTML tags and decode entities
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  navigator.clipboard.writeText(plainText).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
};

// Send Message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  if (!apiKey) {
    showToast('Please set your API key first', 'error');
    showModal();
    return;
  }

  // Create conversation if needed
  if (!currentConversationId) {
    currentConversationId = Date.now().toString();
    conversations.unshift({
      id: currentConversationId,
      title: message.substring(0, 50),
      messages: [],
      createdAt: new Date().toISOString()
    });
  }

  // Add user message
  const userMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString()
  };

  currentMessages.push(userMessage);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;
  
  renderMessages();
  scrollToBottom();

  // Show loading
  const loadingId = Date.now();
  chatMessages.innerHTML += `
    <div class="message assistant" id="loading-${loadingId}">
      <div class="message-avatar">G</div>
      <div class="message-content">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      </div>
    </div>
  `;
  scrollToBottom();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-preview'
    });

    // Convert messages to Gemini format
    const chatHistory = currentMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Remove loading
    const loadingEl = document.getElementById(`loading-${loadingId}`);
    if (loadingEl) loadingEl.remove();

    // Add assistant message
    const assistantMessage = {
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString()
    };

    currentMessages.push(assistantMessage);

    // Update conversation
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
      conversation.messages = currentMessages;
      conversation.updatedAt = new Date().toISOString();
      if (conversation.title === message.substring(0, 50)) {
        conversation.title = message.substring(0, 50);
      }
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations));
    localStorage.setItem(STORAGE_CURRENT_CONVERSATION, currentConversationId);

    renderMessages();
    loadConversations();
  } catch (error) {
    console.error('Error:', error);
    
    // Remove loading
    const loadingEl = document.getElementById(`loading-${loadingId}`);
    if (loadingEl) loadingEl.remove();

    // Show error message
    currentMessages.push({
      role: 'assistant',
      content: `Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: true
    });

    renderMessages();
    showToast('Error: ' + error.message, 'error');
  }
}

// Scroll to bottom
function scrollToBottom() {
  setTimeout(() => {
    const container = document.querySelector('.chat-container');
    container.scrollTop = container.scrollHeight;
  }, 100);
}

// Show Toast
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on outside click
apiKeyModal.addEventListener('click', (e) => {
  if (e.target === apiKeyModal) {
    hideModal();
  }
});
