import { buildPrompt, loadSettings, saveSettings } from "./promptBuilder.js";

const questionEl = document.getElementById("question");
const contextEl = document.getElementById("context");
const modeEl = document.getElementById("mode");
const solveBtn = document.getElementById("solve");
const scanBtn = document.getElementById("scan-question");
const resultSection = document.getElementById("result-section");
const resultEl = document.getElementById("result");
const promptPreviewEl = document.getElementById("prompt-preview");
const copyResultBtn = document.getElementById("copy-result");
const temperatureEl = document.getElementById("temperature");
const temperatureValue = document.getElementById("temperature-value");
const topPEl = document.getElementById("top-p");
const topPValue = document.getElementById("top-p-value");
const maxOutputEl = document.getElementById("max-output");
const statusEl = document.getElementById("status");

let settings;
let statusTimeout;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

function updateStatus(message, variant = "info", persist = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("error", variant === "error");
  statusEl.hidden = false;
  statusEl.setAttribute("aria-hidden", "false");

  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  if (!persist) {
    statusTimeout = setTimeout(() => {
      clearStatus();
    }, 3000);
  }
}

function clearStatus() {
  if (!statusEl) return;
  statusEl.textContent = "";
  statusEl.hidden = true;
  statusEl.setAttribute("aria-hidden", "true");
  statusEl.classList.remove("error");
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = undefined;
  }
}

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0]?.id;
}

async function scanQuestionFromPage(auto = false) {
  try {
    updateStatus("Đang quét đề bài trên tab hiện tại...", "info", true);
    const tabId = await getActiveTabId();
    if (!tabId) {
      throw new Error("Không thể xác định tab đang mở.");
    }

    const response = await chrome.tabs.sendMessage(tabId, { type: "GEMINI_SCAN_QUESTION" });

    const question = response?.question?.trim();
    if (question) {
      if (!questionEl.value || !auto) {
        questionEl.value = question;
      }
      updateStatus("Đã quét được đề bài từ trang.");
    } else if (!auto) {
      updateStatus("Không tìm thấy đề bài, hãy bôi đen nội dung rồi thử lại.", "error", true);
    } else {
      clearStatus();
    }
  } catch (error) {
    if (!auto) {
      updateStatus(`Lỗi khi quét trang: ${error.message}`, "error", true);
    } else {
      clearStatus();
    }
  }
}

async function init() {
  settings = await loadSettings();
  temperatureEl.value = settings.temperature;
  topPEl.value = settings.topP;
  maxOutputEl.value = settings.maxOutputTokens;
  temperatureValue.textContent = settings.temperature.toFixed(1);
  topPValue.textContent = settings.topP.toFixed(2);

  temperatureEl.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    temperatureValue.textContent = value.toFixed(1);
    settings.temperature = value;
    persistSettings();
  });

  topPEl.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    topPValue.textContent = value.toFixed(2);
    settings.topP = value;
    persistSettings();
  });

  maxOutputEl.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    settings.maxOutputTokens = value;
    persistSettings();
  });

  scanQuestionFromPage(true);
}

async function persistSettings() {
  await saveSettings({
    temperature: settings.temperature,
    topP: settings.topP,
    maxOutputTokens: settings.maxOutputTokens
  });
}

function validate() {
  const question = questionEl.value.trim();
  if (!question) {
    throw new Error("Vui lòng nhập bài tập.");
  }
  return question;
}

async function handleSolve() {
  const hadPreviousResult = !resultSection.hidden && resultEl.innerText.trim().length > 0;
  const previousResult = resultEl.innerText;

  try {
    const question = validate();
    const context = contextEl.value;
    const mode = modeEl.value;

    solveBtn.disabled = true;
    solveBtn.textContent = "Đang giải...";
    clearStatus();
    resultSection.hidden = true;

    const prompt = buildPrompt(question, mode, context, settings.templates);
    promptPreviewEl.textContent = prompt;

    const response = await sendMessage({
      type: "GEMINI_REQUEST",
      payload: { question, context, mode }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Không thể kết nối tới Gemini");
    }

    resultEl.innerText = response.text;
    resultSection.hidden = false;
    copyResultBtn.disabled = false;
    copyResultBtn.textContent = "Sao chép";
  } catch (error) {
    if (error?.message) {
      updateStatus(error.message, "error", true);
    } else {
      updateStatus("Không thể giải bài, vui lòng thử lại.", "error", true);
    }

    if (hadPreviousResult) {
      resultEl.innerText = previousResult;
      resultSection.hidden = false;
    }

    copyResultBtn.disabled = false;
    copyResultBtn.textContent = "Sao chép";
  } finally {
    solveBtn.disabled = false;
    solveBtn.textContent = "Giải bài tập";
  }
}

solveBtn.addEventListener("click", handleSolve);

scanBtn.addEventListener("click", () => scanQuestionFromPage(false));

copyResultBtn.addEventListener("click", async () => {
  const text = resultEl.innerText.trim();
  if (!text) return;
  try {
    copyResultBtn.disabled = true;
    copyResultBtn.textContent = "Đang chép...";
    await navigator.clipboard.writeText(text);
    copyResultBtn.textContent = "Đã chép";
    setTimeout(() => {
      copyResultBtn.textContent = "Sao chép";
      copyResultBtn.disabled = false;
    }, 1200);
  } catch (error) {
    copyResultBtn.textContent = "Thử lại";
    copyResultBtn.disabled = false;
    updateStatus("Không thể sao chép vào clipboard", "error");
  }
});

init();
