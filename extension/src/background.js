import { buildPrompt, loadSettings } from "./promptBuilder.js";
import { GoogleGenAI } from "./googleGenAI.js";

let cachedClient = null;

function getClient(apiKey) {
  if (cachedClient && cachedClient.apiKey === apiKey) {
    return cachedClient;
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

async function ensureContextMenu() {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.warn("Không thể xoá menu cũ:", chrome.runtime.lastError.message);
    }
    chrome.contextMenus.create({
      id: "gemini-solve",
      title: "Giải bài tập với Gemini",
      contexts: ["selection", "page"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn("Không thể tạo menu Gemini:", chrome.runtime.lastError.message);
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  ensureContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "gemini-solve") return;
  const question = info.selectionText || info.pageUrl || "";
  if (!question) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "GEMINI_SOLVE",
    payload: { question }
  });
});

async function callGemini(prompt, settings) {
  if (!settings.apiKey) {
    throw new Error("Chưa cấu hình Gemini API key.");
  }

  const maxOutputTokens = Number(settings.maxOutputTokens) || 1024;
  const temperature = Number(settings.temperature);
  const topP = Number(settings.topP);

  const client = getClient(settings.apiKey);

  const response = await client.models.generateContent({
    model: settings.model,
    contents: prompt,
    generationConfig: {
      temperature: Number.isFinite(temperature) ? temperature : 0.3,
      topP: Number.isFinite(topP) ? topP : 0.95,
      maxOutputTokens
    }
  });

  return response.text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GEMINI_REQUEST") return;

  (async () => {
    try {
      const settings = await loadSettings();
      const prompt = buildPrompt(message.payload.question, message.payload.mode, message.payload.context, settings.templates);
      const text = await callGemini(prompt, settings);
      sendResponse({ ok: true, text, prompt });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});
