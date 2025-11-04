import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field

SYSTEM_PROMPT_FOR_HOMEWORK_SOLVER = """Chế độ: Homework EXACT.\n- Mục tiêu: Cho ra duy nhất đáp án đúng, không thêm bất kỳ lời/ý nào trừ khi được yêu cầu.\n- Nếu user yêu cầu \"giải thích\", \"trình bày\", \"bước giải\" thì mới giải thích.\n\nQuy tắc chống \"thêm ý\" và suy diễn:\n- Chỉ dùng thông tin trong đề + context gửi kèm.\n- Không thêm nền tảng lý thuyết, ví dụ mới, mẹo, hay bình luận ngoài đề.\n- Không tự bịa dữ kiện hoặc công thức không có trong kiến thức chuẩn.\n\nThiếu dữ liệu:\n- Nếu đề thiếu dữ liệu, mơ hồ, hoặc có nhiều đáp án mà không đủ thông tin để chọn:\n    - Trả lời chính xác chuỗi: \"Thiếu dữ liệu\"\n    - Sau đó liệt kê tối thiểu các dữ kiện còn thiếu (ngắn gọn).\n    - Tuyệt đối KHÔNG đoán đáp án.\n\nNgôn ngữ & ký hiệu:\n- Giữ nguyên ngôn ngữ, ký hiệu, biến, đơn vị theo đề bài.\n- Nếu đề bằng tiếng Việt -> trả lời tiếng Việt.\n- Nếu đề bằng tiếng Anh -> trả lời tiếng Anh.\n- Không tự ý đổi đơn vị trừ khi đề yêu cầu.\n\nBước giải:\n- Mặc định KHÔNG hiện bước giải chi tiết.\n- Chỉ khi đề yêu cầu rõ ràng kiểu: \"trình bày bước giải\", \"giải thích\", \"giải chi tiết\"…:\n    - Khi đó trình bày ngắn gọn, mạch lạc.\n    - Dòng cuối luôn có format: \"Final: <đáp án cuối cùng>\".\n\nĐộ chính xác số:\n- Nếu đề yêu cầu rõ số chữ số có nghĩa hoặc cách làm tròn -> tuân thủ.\n- Nếu không yêu cầu:\n    - Dùng 3–4 chữ số có nghĩa là mặc định.\n    - Luôn ghi đơn vị (nếu có).\n\nNhiều câu hỏi trong cùng 1 đề:\n- Trả lời lần lượt theo thứ tự a), b), c)… hoặc (1), (2), (3)… đúng format đề gốc.\n- Nếu thiếu dữ liệu cho một phần, chỉ phần đó báo \"Thiếu dữ liệu\", không làm hỏng các phần khác.\n\nMôn học:\n- Hỗ trợ: Toán, Lý, Hóa, Sinh, Tin, tiếng Anh, và các môn tính toán/giải bài tập phổ biến.\n- Nếu bài thuộc lĩnh vực ngoài phạm vi bài tập học thuật cơ bản (vd: nội dung vi phạm chính sách) -> từ chối lịch sự."""

ALLOWED_MODELS = {
    "openai/gpt-oss-120b",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-haiku-4.5",
    "openai/gpt-5",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "openai/gpt-5-codex",
    "deepseek/deepseek-v3.2-exp",
}

DEFAULT_MODEL = "openai/gpt-5"

api_key = os.getenv("AI_GATEWAY_API_KEY")
client: Optional[OpenAI] = None
if api_key:
    client = OpenAI(api_key=api_key, base_url="https://ai-gateway.vercel.sh/v1")

app = FastAPI(title="AI Gateway Homework Solver", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SolveRequest(BaseModel):
    question: str = Field(..., description="The main question or exercise text.")
    context: Optional[str] = Field(None, description="Additional context if available.")
    model: Optional[str] = Field(None, description="Model identifier from AI Gateway.")


class UsagePayload(BaseModel):
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class SolveResponse(BaseModel):
    ok: bool
    answer: Optional[str] = None
    explanation: Optional[str] = None
    raw: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[UsagePayload] = None
    error: Optional[str] = None
    detail: Optional[Any] = None


def ensure_client() -> OpenAI:
    if client:
        return client
    raise RuntimeError("AI_GATEWAY_API_KEY is not set. Please configure the environment variable.")


def build_user_payload(question: str, context: Optional[str]) -> str:
    base = question.strip()
    if context:
        extra = context.strip()
        if extra:
            base += "\n\nContext:\n" + extra
    return base


def extract_answer_and_explanation(content: str) -> Dict[str, Optional[str]]:
    text = (content or "").strip()
    if not text:
        return {"answer": "", "explanation": None}

    separators = ["\n\nExplanation:", "\n\nGiải thích:", "\n\nLý do:"]
    for separator in separators:
        if separator in text:
            answer, explanation = text.split(separator, 1)
            return {"answer": answer.strip(), "explanation": explanation.strip()}

    if "\n\n" in text:
        answer, explanation = text.split("\n\n", 1)
        return {"answer": answer.strip(), "explanation": explanation.strip() or None}

    return {"answer": text, "explanation": None}


@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest) -> SolveResponse:
    model = request.model or DEFAULT_MODEL
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{model}' is not supported.")

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    try:
        client_instance = ensure_client()
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_FOR_HOMEWORK_SOLVER},
            {"role": "user", "content": build_user_payload(question, request.context)},
        ]

        response = client_instance.chat.completions.create(model=model, messages=messages)
        message_content = response.choices[0].message.content if response.choices else ""
        parsed = extract_answer_and_explanation(message_content)

        usage_payload = None
        if response.usage:
            usage_payload = UsagePayload(
                prompt_tokens=getattr(response.usage, "prompt_tokens", None),
                completion_tokens=getattr(response.usage, "completion_tokens", None),
                total_tokens=getattr(response.usage, "total_tokens", None),
            )

        return SolveResponse(
            ok=True,
            answer=parsed.get("answer", ""),
            explanation=parsed.get("explanation"),
            raw=message_content,
            model=model,
            usage=usage_payload,
        )
    except Exception as exc:  # noqa: BLE001
        return SolveResponse(
            ok=False,
            error="Không thể gọi mô hình AI.",
            detail=str(exc),
        )


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}
