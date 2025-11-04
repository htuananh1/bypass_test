const BACKEND_URL = 'http://localhost:8000/solve';

const modelSelect = document.getElementById('model');
const questionTextarea = document.getElementById('question');
const contextTextarea = document.getElementById('context');
const solveButton = document.getElementById('solve');
const statusText = document.getElementById('status');
const outputSection = document.getElementById('output');
const answerPre = document.getElementById('answer');
const explanationWrapper = document.getElementById('explanation-wrapper');
const explanationPre = document.getElementById('explanation');

async function loadInitialState() {
  const stored = await chrome.storage.local.get(['lastSelection', 'lastModel']);
  if (stored.lastSelection?.text) {
    questionTextarea.value = stored.lastSelection.text;
  }
  if (stored.lastModel && [...modelSelect.options].some((opt) => opt.value === stored.lastModel)) {
    modelSelect.value = stored.lastModel;
  }
}

function setLoading(isLoading) {
  solveButton.disabled = isLoading;
  solveButton.textContent = isLoading ? 'Đang xử lý...' : 'Solve / Giải bài tập';
  statusText.textContent = isLoading ? 'Đang gọi backend qua AI Gateway...' : '';
}

function renderResult(result) {
  if (!result) {
    outputSection.classList.add('hidden');
    return;
  }
  outputSection.classList.remove('hidden');
  answerPre.textContent = result.answer || '';
  if (result.explanation) {
    explanationWrapper.classList.remove('hidden');
    explanationPre.textContent = result.explanation;
  } else {
    explanationWrapper.classList.add('hidden');
    explanationPre.textContent = '';
  }
}

async function solveQuestion() {
  const question = questionTextarea.value.trim();
  const context = contextTextarea.value.trim();
  const model = modelSelect.value;

  if (!question) {
    statusText.textContent = 'Vui lòng nhập câu hỏi.';
    return;
  }

  setLoading(true);
  renderResult(null);

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question,
        context: context || null,
        model
      })
    });

    if (!response.ok) {
      throw new Error(`Backend trả về lỗi ${response.status}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Backend không xử lý được yêu cầu.');
    }

    await chrome.storage.local.set({ lastModel: model });
    statusText.textContent = 'Hoàn tất.';
    renderResult(data);
  } catch (error) {
    console.error(error);
    statusText.textContent = error.message || 'Có lỗi xảy ra.';
  } finally {
    setLoading(false);
  }
}

solveButton.addEventListener('click', solveQuestion);

document.addEventListener('DOMContentLoaded', () => {
  loadInitialState();
});
