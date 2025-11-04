# AI Gateway GPT Solver Extension

Một Chrome Extension (Manifest V3) giúp lấy nhanh nội dung bài tập bằng cách bôi đen văn bản trên trang rồi gửi trực tiếp tới GPT thông qua AI Gateway của Vercel. Toàn bộ cấu hình (API key, tùy chọn model, chế độ trả lời) đều lưu cục bộ trong trình duyệt của bạn.

## Tính năng chính
- Tự động lấy văn bản đang được bôi đen; nếu không có, sẽ đọc thông minh nội dung trong ô nhập/text editor đang focus.
- Gọi trực tiếp endpoint `https://ai-gateway.vercel.sh/v1/chat/completions` từ service worker, không cần proxy phụ trợ.
- Bộ prompt chuẩn (chỉ đáp án hoặc giải chi tiết) yêu cầu GPT tự nhận diện môn học và luôn chèn đoạn mã Python mẫu sử dụng `openai` với AI Gateway (import `os` và `OpenAI`).
- Chọn nhanh model GPT và ngôn ngữ trả lời ngay trong popup.
- Bộ nhớ đệm theo `hash(question + cấu hình)` bằng `chrome.storage.local`, có thể bật/tắt.
- Giới hạn tốc độ: tối thiểu 1 yêu cầu / 5 giây, có thể bỏ qua thủ công nếu cần.
- Giao diện glassmorphism nhỏ gọn, hỗ trợ sao chép nhanh kết quả.

## Cài đặt & sử dụng
1. Clone repo này về máy.
2. Mở `chrome://extensions`, bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `extension`.
4. Mở popup của extension, nhập AI Gateway API key (Bearer token) trong ô **API key**.
5. Chọn model mong muốn (ví dụ `openai/gpt-oss-120b`, `openai/gpt-4o-mini`, `openai/gpt-oss-mini`).
6. Nhấn **Lưu API key** để lưu vào `chrome.storage.sync`.
7. Bôi đen câu hỏi trên trang → mở popup (hoặc nhấn **Lấy lại vùng chọn** nếu popup đang mở).
8. Chọn chế độ "Chỉ đáp án" (thêm dòng nhận diện môn + đáp án) hoặc "Giải thích chi tiết", cùng ngôn ngữ mong muốn.
9. Nhấn **Gửi GPT** để lấy kết quả. Có thể bật **Bật cache đáp án** để lưu kết quả cho lần gọi sau.
10. Nhấn **Copy** để sao chép câu trả lời vào clipboard.

> **Lưu ý bảo mật:** API key chỉ được lưu trong `chrome.storage.sync` của trình duyệt trên máy bạn. Mã nguồn không gửi key ra ngoài domain AI Gateway của Vercel.

## Đoạn mã Python mẫu được chèn vào kết quả
Mọi prompt đều yêu cầu GPT cung cấp nguyên văn đoạn mã sau, giúp người học tái sử dụng nhanh:

```python
import os
from openai import OpenAI

client = OpenAI(
  api_key=os.getenv('AI_GATEWAY_API_KEY'),
  base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
  model='openai/gpt-oss-120b',
  messages=[
    {
      'role': 'user',
      'content': 'Why is the sky blue?'
    }
  ]
)
```

## Quản lý bộ nhớ đệm & rate limit
- Cache được bật mặc định. Bỏ chọn **Bật cache đáp án** nếu muốn luôn gọi API (bỏ qua giới hạn 5 giây bằng cách bật "Bỏ qua giới hạn 5 giây").
- Các bản ghi cache lưu trong `chrome.storage.local` với tiền tố `gpt-cache:`. Để xoá toàn bộ, vào DevTools của extension → tab Application → Storage → xóa mục tương ứng, hoặc chạy `chrome.storage.local.clear()` từ console popup/service worker.
- Khi bị HTTP 429 hoặc giới hạn client (1 request/5 giây), trạng thái hiển thị "Giới hạn tạm thời". Chờ 5 giây rồi thử lại.

## Xử lý sự cố
| Vấn đề | Cách khắc phục |
| --- | --- |
| 401/403 (API key sai/hết hạn) | Kiểm tra lại key trong trang [AI Gateway Dashboard](https://ai-gateway.vercel.sh/). Nhập key mới và lưu lại. |
| 429 (quota hoặc rate limit) | Chờ thêm thời gian, giảm số lần gửi. Popup sẽ báo trạng thái "Giới hạn tạm thời". |
| CORS bị chặn | Đảm bảo service worker đang chạy (không cần proxy). Nếu vẫn lỗi, mở DevTools → Application → Service Workers → check "Bypass for network". |
| Trang không có câu hỏi | Copy thủ công câu hỏi vào ô nhập trong popup (hoặc gõ trực tiếp). |
| Mất mạng | Popup hiển thị lỗi mạng, hãy kiểm tra kết nối internet rồi thử lại. |

## Phân quyền
`manifest.json` chỉ yêu cầu:
- `activeTab`, `scripting`, `storage`
- `host_permissions: ["https://ai-gateway.vercel.sh/*"]`

## Tạo lại gói zip
Repository không kèm `extension.zip`. Nếu muốn phát hành nhanh:

```bash
cd /path/to/repo
zip -r extension.zip extension
```

## Cảnh báo bảo mật
- Không chia sẻ API key công khai.
- Khi không sử dụng, nên tắt/bỏ extension.
- Xem log ở `chrome://extensions` → background page để đảm bảo không có request lạ.
