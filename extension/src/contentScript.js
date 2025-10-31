const PANEL_ID = "gemini-orion-panel";
const CONTENT_ID = "gemini-orion-panel-content";
const COPY_ID = "gemini-orion-panel-copy";

function extractQuestionFromPage() {
  const selection = window.getSelection()?.toString().trim();
  if (selection) {
    return selection;
  }

  const questionSelectors = [
    "[data-question]",
    "[data-task]",
    "[data-problem]",
    "article h1",
    "article h2",
    ".question",
    ".exercise",
    ".problem",
    "main h1",
    "main h2",
    "main h3"
  ];

  for (const selector of questionSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.innerText.trim();
      if (text.length > 12) {
        return text.slice(0, 1200);
      }
    }
  }

  const paragraphs = Array.from(document.querySelectorAll("p, li"));
  for (const paragraph of paragraphs) {
    const text = paragraph.innerText.trim();
    if (text.length >= 40 && /[?!.]/.test(text)) {
      return text.slice(0, 1200);
    }
  }

  return "";
}

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) {
    return panel;
  }

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "width:380px",
      "max-height:65vh",
      "overflow:hidden",
      "background:linear-gradient(145deg,#0f172a,#1e293b)",
      "color:#f8fafc",
      "font-family:'Inter',system-ui,sans-serif",
      "box-shadow:0 28px 60px rgba(15,23,42,0.5)",
      "border-radius:22px",
      "z-index:2147483647",
      "padding:20px",
      "display:none"
    ].join(";")
  );

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";

  const title = document.createElement("div");
  title.innerHTML = `
    <strong style="font-size:1.05rem;display:block;">Gemini Orion</strong>
    <span style="font-size:0.75rem;opacity:0.75;">Giải bài tập trực tiếp trên trang</span>
  `;

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "8px";

  const copy = document.createElement("button");
  copy.id = COPY_ID;
  copy.textContent = "Sao chép";
  copy.setAttribute(
    "style",
    [
      "background:rgba(148,163,184,0.16)",
      "border:1px solid rgba(148,163,184,0.35)",
      "color:inherit",
      "padding:6px 12px",
      "border-radius:999px",
      "cursor:pointer",
      "font-size:0.75rem"
    ].join(";")
  );

  copy.addEventListener("click", async () => {
    const content = document.getElementById(CONTENT_ID)?.innerText || "";
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      copy.textContent = "Đã chép";
      setTimeout(() => {
        copy.textContent = "Sao chép";
      }, 1500);
    } catch (error) {
      console.warn("Không thể sao chép", error);
    }
  });

  const close = document.createElement("button");
  close.textContent = "Đóng";
  close.setAttribute(
    "style",
    [
      "background:rgba(148,163,184,0.08)",
      "border:1px solid rgba(148,163,184,0.25)",
      "color:inherit",
      "padding:6px 12px",
      "border-radius:999px",
      "cursor:pointer",
      "font-size:0.75rem"
    ].join(";")
  );

  close.addEventListener("click", () => {
    panel.style.display = "none";
  });

  controls.appendChild(copy);
  controls.appendChild(close);
  header.appendChild(title);
  header.appendChild(controls);

  const body = document.createElement("div");
  body.id = CONTENT_ID;
  body.setAttribute(
    "style",
    [
      "margin-top:18px",
      "padding:16px",
      "background:rgba(15,23,42,0.55)",
      "border:1px solid rgba(148,163,184,0.25)",
      "border-radius:16px",
      "white-space:pre-wrap",
      "word-break:break-word",
      "font-size:0.92rem",
      "line-height:1.5"
    ].join(";")
  );

  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);
  return panel;
}

function setPanelState({ text, loading = false, tone = "info" }) {
  const panel = ensurePanel();
  const content = panel.querySelector(`#${CONTENT_ID}`);
  panel.style.display = "block";

  const background =
    tone === "error"
      ? "linear-gradient(145deg,#7f1d1d,#991b1b)"
      : tone === "success"
      ? "linear-gradient(145deg,#0f172a,#0b3c5d)"
      : "rgba(15,23,42,0.55)";

  content.style.background = background;
  content.style.borderColor = tone === "error" ? "rgba(248,113,113,0.45)" : "rgba(148,163,184,0.25)";
  content.textContent = loading ? `${text}\n\n…` : text;

  const copyButton = document.getElementById(COPY_ID);
  if (copyButton) {
    copyButton.disabled = loading;
    copyButton.style.opacity = loading ? "0.6" : "1";
    copyButton.textContent = loading ? "Đang tạo" : "Sao chép";
  }

  return panel;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GEMINI_SCAN_QUESTION") {
    const question = extractQuestionFromPage();
    sendResponse({ question });
    return;
  }

  if (message.type !== "GEMINI_SOLVE") {
    return;
  }

  setPanelState({ text: "Đang gửi yêu cầu lên Gemini", loading: true });

  chrome.runtime.sendMessage(
    {
      type: "GEMINI_REQUEST",
      payload: {
        mode: "orion",
        question: message.payload.question || extractQuestionFromPage(),
        context: window.getSelection()?.toString() || ""
      }
    },
    (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        setPanelState({ text: `Không thể giải bài: ${error.message}`, tone: "error" });
        return;
      }

      if (!response?.ok) {
        setPanelState({ text: `Không thể giải bài: ${response?.error}`, tone: "error" });
        return;
      }

      setPanelState({ text: response.text, tone: "success" });
    }
  );
});
