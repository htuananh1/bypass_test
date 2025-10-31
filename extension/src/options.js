import { loadSettings, saveSettings, exportDefaults } from "./promptBuilder.js";

const apiKeyInput = document.getElementById("api-key");
const modelSelect = document.getElementById("model");
const templateStandard = document.getElementById("template-standard");
const templateOrion = document.getElementById("template-orion");
const saveButton = document.getElementById("save");
const restoreButton = document.getElementById("restore");
const statusBanner = document.getElementById("status");

let statusTimeout;

function showStatus(message, variant = "info") {
  if (!statusBanner) return;
  statusBanner.textContent = message;
  statusBanner.style.borderColor =
    variant === "error" ? "rgba(248, 113, 113, 0.6)" : "rgba(59, 130, 246, 0.35)";
  statusBanner.style.background =
    variant === "error" ? "rgba(248, 113, 113, 0.15)" : "rgba(59, 130, 246, 0.12)";
  statusBanner.setAttribute("aria-hidden", "false");

  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }

  statusTimeout = setTimeout(() => {
    statusBanner.setAttribute("aria-hidden", "true");
  }, 2500);
}

async function init() {
  const settings = await loadSettings();
  apiKeyInput.value = settings.apiKey || "";
  modelSelect.value = settings.model || "gemini-2.5-flash";
  templateStandard.value = settings.templates.standard;
  templateOrion.value = settings.templates.orion;
}

async function handleSave() {
  saveButton.disabled = true;
  saveButton.textContent = "Đang lưu...";
  try {
    await saveSettings({
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      templates: {
        standard: templateStandard.value,
        orion: templateOrion.value
      }
    });
    saveButton.textContent = "Đã lưu!";
    showStatus("Đã cập nhật cấu hình Gemini.");
    setTimeout(() => {
      saveButton.textContent = "Lưu cấu hình";
      saveButton.disabled = false;
    }, 1200);
  } catch (error) {
    console.error(error);
    saveButton.textContent = "Lỗi khi lưu";
    saveButton.disabled = false;
    showStatus("Không thể lưu cấu hình", "error");
  }
}

function handleRestore() {
  const defaults = exportDefaults();
  templateStandard.value = defaults.standard;
  templateOrion.value = defaults.orion;
  modelSelect.value = "gemini-2.5-flash";
  showStatus("Đã khôi phục template mặc định.");
}

saveButton.addEventListener("click", handleSave);
restoreButton.addEventListener("click", handleRestore);

init();
