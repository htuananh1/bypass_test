# AI Gateway Homework Solver Extension

This project bundles a Chrome Extension (Manifest V3) and a small FastAPI backend. The extension captures text selections, offers a draggable in-page widget, and sends problems to the backend which calls AI Gateway models.

## Repository structure

```
extension/   # Chrome extension source (Manifest V3)
backend/     # FastAPI service that calls AI Gateway
```

## Environment variables

Set the AI Gateway API key before running the backend:

```bash
export AI_GATEWAY_API_KEY="sk-..."
```

## Backend setup

1. Navigate to the backend folder:

   ```bash
   cd backend
   ```

2. (Optional) Create a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. Install dependencies and run the server:

   ```bash
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

The extension expects the backend on `http://localhost:8000/solve`.

## Loading the Chrome extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `extension` directory.
4. Pin the extension for quick access.

## Using the extension

- Select text on any webpage; the extension stores it automatically.
- Click the toolbar icon or the floating in-page "AI" widget to open the UI.
- Choose a model, optionally provide context, and press **Solve / Giải bài tập**.
- Results show the final answer and a short explanation when available.
- A context menu item "Giải bài này bằng AI Gateway" also opens the widget prefilled with the selected text.
