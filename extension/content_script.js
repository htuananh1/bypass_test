(function () {
  const QUESTION_SELECTORS = ['p', 'li', 'div', 'h1', 'h2', 'h3', 'pre', 'code'];
  const KEYWORDS = ['bài', 'câu', 'question', 'problem', 'mcq', 'chọn đáp án'];
  const MAX_TEXT = 2000;
  const MAX_CONTEXT = 1500;

  window.addEventListener('message', (event) => {
    if (event?.data?.type === 'HW_RESCAN') {
      publishQuestions();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    publishQuestions();
  });

  publishQuestions();

  function publishQuestions() {
    const questions = extractQuestions();
    window._hw_questions = questions;
    window.postMessage({ type: 'HW_QUESTIONS_FOUND', payload: questions }, '*');
  }

  function extractQuestions() {
    const results = [];
    const seen = new Set();

    const elements = Array.from(document.querySelectorAll(QUESTION_SELECTORS.join(',')));

    elements.forEach((el, index) => {
      const text = cleanText(el.innerText || el.textContent || '');
      if (!text) return;

      const scored = scoreText(text, el);
      if (!scored.isQuestion) return;

      const context = collectContext(el);
      const id = `q-${index}-${scored.hash}`;
      if (seen.has(id)) return;
      seen.add(id);

      results.push({
        id,
        text: text.slice(0, MAX_TEXT),
        context: context.slice(0, MAX_CONTEXT),
        source: window.location.href
      });
    });

    return dedupe(results);
  }

  function cleanText(value) {
    return (value || '')
      .replace(/\s+/g, ' ')
      .replace(/\u00a0/g, ' ')
      .trim();
  }

  function scoreText(text, element) {
    const lower = text.toLowerCase();
    let score = 0;

    if (/[?？！]$/.test(lower)) {
      score += 2;
    }

    if (KEYWORDS.some((kw) => lower.includes(kw))) {
      score += 2;
    }

    if (/\\\(|\\\)|\\\[|\\\]|\\begin\{equation\}/i.test(text)) {
      score += 2;
    }

    if (text.length > 200 && !/[.?!]$/.test(text)) {
      score -= 1;
    }

    if (hasChoiceInputsNearby(element)) {
      score += 1;
    }

    return {
      isQuestion: score >= 2,
      hash: simpleHash(text)
    };
  }

  function hasChoiceInputsNearby(element) {
    const nearbyInputs = element.querySelectorAll?.('input[type="radio"], input[type="checkbox"]');
    if (nearbyInputs && nearbyInputs.length > 0) return true;
    const parent = element.closest('li, div, section, article');
    if (parent) {
      const inputs = parent.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (inputs.length > 0) return true;
    }
    return false;
  }

  function collectContext(element) {
    const snippets = [];
    let current = element;
    while (current && snippets.join(' ').length < MAX_CONTEXT) {
      current = current.nextElementSibling;
      if (!current) break;
      const text = cleanText(current.innerText || current.textContent || '');
      if (!text) continue;
      snippets.push(text);
    }
    return snippets.join(' ').slice(0, MAX_CONTEXT);
  }

  function dedupe(items) {
    const map = new Map();
    items.forEach((item) => {
      const key = item.text.toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  window.extractQuestions = extractQuestions;
})();
