const DEFAULT_TEMPLATES = {
  standard: `Bạn là trợ lý Gemini hỗ trợ học sinh giải bài tập. Hãy giải thích từng bước và nêu kết quả cuối cùng.
Câu hỏi: {{question}}
Ngữ cảnh thêm (nếu có): {{context}}`,
  orion: `Bạn là trợ lý Gemini hỗ trợ nền tảng Orion. Hãy giữ định dạng Markdown gọn gàng với các mục: Phân tích, Lời giải từng bước, Kiểm tra nhanh.
Bài tập Orion: {{question}}
Thông tin thêm: {{context}}`
};

export async function loadSettings() {
  const defaults = {
    apiKey: "",
    model: "gemini-2.5-flash",
    temperature: 0.3,
    topP: 0.95,
    maxOutputTokens: 1024,
    templates: DEFAULT_TEMPLATES
  };

  return new Promise((resolve) => {
    chrome.storage.sync.get(defaults, (items) => {
      const temperature = typeof items.temperature === "number" ? items.temperature : Number(items.temperature) || defaults.temperature;
      const topP = typeof items.topP === "number" ? items.topP : Number(items.topP) || defaults.topP;
      const maxOutputTokens = typeof items.maxOutputTokens === "number" ? items.maxOutputTokens : Number(items.maxOutputTokens) || defaults.maxOutputTokens;
      resolve({
        ...defaults,
        ...items,
        temperature,
        topP,
        maxOutputTokens,
        templates: {
          ...DEFAULT_TEMPLATES,
          ...(items.templates || {})
        },
        model: items.model || defaults.model
      });
    });
  });
}

export function buildPrompt(question, mode, context = "", templates = DEFAULT_TEMPLATES) {
  const template = templates[mode] || templates.standard;
  const safeQuestion = question.trim();
  const safeContext = context.trim() || "Không có";
  return template
    .replaceAll("{{question}}", safeQuestion)
    .replaceAll("{{context}}", safeContext);
}

export function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}

export function exportDefaults() {
  return { ...DEFAULT_TEMPLATES };
}
