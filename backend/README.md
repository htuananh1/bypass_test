# AI Gateway Homework Solver Backend

This FastAPI service exposes a `/solve` endpoint that proxies homework questions to AI Gateway (https://ai-gateway.vercel.sh).

## Prerequisites

- Python 3.10+
- An API key from AI Gateway stored in `AI_GATEWAY_API_KEY`

## Setup

1. Create and activate a virtual environment (optional but recommended):

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Export the AI Gateway API key:

   ```bash
   export AI_GATEWAY_API_KEY="sk-..."
   ```

## Run the server

Start the FastAPI server with Uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The extension expects the backend at `http://localhost:8000/solve` by default.

## Endpoints

- `GET /health` – simple health check.
- `POST /solve` – accepts:

  ```json
  {
    "question": "<question text>",
    "context": "<optional context>",
    "model": "<optional model id>"
  }
  ```

  Returns the AI Gateway response mapped to:

  ```json
  {
    "ok": true,
    "answer": "",
    "explanation": "",
    "raw": "",
    "model": "",
    "usage": {
      "prompt_tokens": 0,
      "completion_tokens": 0,
      "total_tokens": 0
    }
  }
  ```

## Loading the Chrome extension

1. Build and run the backend as above.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose the `extension` folder in this repository.
5. Pin the extension to access the popup quickly.

The popup and in-page widget will call the backend running locally.
