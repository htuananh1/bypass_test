const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function normaliseContents(contents) {
  if (!contents) {
    return [
      {
        role: "user",
        parts: [{ text: "" }]
      }
    ];
  }

  if (typeof contents === "string") {
    return [
      {
        role: "user",
        parts: [{ text: contents }]
      }
    ];
  }

  if (Array.isArray(contents)) {
    return contents.map((item) => {
      if (typeof item === "string") {
        return {
          role: "user",
          parts: [{ text: item }]
        };
      }

      if (item && typeof item === "object" && Array.isArray(item.parts)) {
        return {
          role: item.role || "user",
          parts: item.parts.map((part) => ({
            text: part?.text ?? ""
          }))
        };
      }

      return {
        role: "user",
        parts: [{ text: "" }]
      };
    });
  }

  if (contents && typeof contents === "object" && Array.isArray(contents.parts)) {
    return [
      {
        role: contents.role || "user",
        parts: contents.parts.map((part) => ({ text: part?.text ?? "" }))
      }
    ];
  }

  return [
    {
      role: "user",
      parts: [{ text: String(contents) }]
    }
  ];
}

function extractTextFromCandidates(candidates = []) {
  return candidates
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("\n\n");
}

export class GoogleGenAI {
  constructor({ apiKey } = {}) {
    this.apiKey = apiKey || "";
    this.models = {
      generateContent: async (options) => this.generateContent(options)
    };
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey || "";
  }

  async generateContent({ model, contents, generationConfig } = {}) {
    if (!this.apiKey) {
      throw new Error("Thiếu Gemini API key.");
    }

    const safeModel = (model || "gemini-2.5-flash").replace(/^models\//, "");
    const body = {
      contents: normaliseContents(contents),
      generationConfig: generationConfig || {}
    };

    const response = await fetch(
      `${BASE_URL}/models/${safeModel}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API lỗi (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = extractTextFromCandidates(data?.candidates);

    return {
      text: text || "Không nhận được phản hồi.",
      raw: data
    };
  }
}

export default GoogleGenAI;
