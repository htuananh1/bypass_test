# GPT Homework Solver Extension

Một Chrome Extension (Manifest V3) giúp lấy nhanh nội dung bài tập bằng cách bôi đen trên trang web rồi gửi tới GPT thông qua Vercel AI Gateway để sinh lời giải theo bộ prompt chuẩn. Mọi dữ liệu, bao gồm API key, đều lưu cục bộ trên máy bạn.

## Tính năng chính
- Tự động lấy văn bản đang được bôi đen hoặc vùng chọn trong ô nhập liệu khi mở popup.
- Gọi trực tiếp endpoint OpenAI-compatible `/chat/completions` của Vercel AI Gateway từ service worker, không cần server trung gian.
- Bộ prompt chuẩn được tối ưu cho GPT với lựa chọn: chỉ trả đáp án, giải chi tiết hoặc yêu cầu tùy chỉnh.
- AI tự nhận biết môn học từ nội dung được chọn, bạn chỉ cần chọn ngôn ngữ và model GPT.
- Bộ nhớ đệm theo `hash(question + cấu hình)` bằng `chrome.storage.local`, có thể bật/tắt.
- Giới hạn tốc độ: tối thiểu 1 yêu cầu / 5 giây, có thể bỏ qua thủ công nếu cần.
- Giao diện glassmorphism nhỏ gọn, hỗ trợ sao chép nhanh kết quả.

## Cài đặt & sử dụng
1. Clone repo này về máy.
2. Mở `chrome://extensions`, bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `extension`.
4. Mở popup của extension, nhập API key Vercel AI Gateway trong ô **API key** (ẩn mặc định, có nút hiển/ẩn).
5. Chọn model GPT hỗ trợ trên gateway (ví dụ `openai/gpt-4o-mini`, `openai/gpt-4o` hoặc `openai/gpt-oss-120b`).
6. Nhấn **Lưu API key** để lưu vào `chrome.storage.sync`.
7. Bôi đen câu hỏi trên trang → mở popup (hoặc nhấn **Lấy lại vùng chọn** nếu popup đang mở).
8. Tùy chỉnh bộ prompt (đáp án, giải chi tiết hoặc nhập yêu cầu riêng) và chọn ngôn ngữ mong muốn.
9. Nhấn **Gửi GPT** để lấy kết quả. Có thể bật **Bật cache đáp án** để lưu kết quả cho lần gọi sau.
10. Nhấn **Copy** để sao chép câu trả lời vào clipboard.

> **Lưu ý bảo mật:** API key chỉ được lưu trong `chrome.storage.sync` của trình duyệt trên máy bạn. Mã nguồn không chứa và không gửi key ra ngoài domain `https://ai-gateway.vercel.sh`.

## Quản lý bộ nhớ đệm & rate limit
- Cache được bật mặc định. Bỏ chọn **Bật cache đáp án** nếu muốn luôn gọi API (bỏ qua giới hạn 5 giây bằng cách bật "Bỏ qua giới hạn 5 giây").
- Các bản ghi cache lưu trong `chrome.storage.local` với tiền tố `gpt-cache:`. Để xoá toàn bộ, vào DevTools của extension → tab Application → Storage → xóa mục tương ứng, hoặc chạy `chrome.storage.local.clear()` từ console popup/service worker.
- Khi bị HTTP 429 hoặc giới hạn client (1 request/5 giây), trạng thái hiển thị "Giới hạn tạm thời". Chờ 5 giây rồi thử lại.

## Xử lý sự cố
| Vấn đề | Cách khắc phục |
| --- | --- |
| 401/403 (API key sai/hết hạn) | Kiểm tra lại key trong trang quản lý Vercel AI Gateway. Nhập key mới và lưu lại. |
| 429 (quota hoặc rate limit) | Chờ thêm thời gian, giảm số lần gửi. Popup sẽ báo trạng thái "Giới hạn tạm thời". |
| Lỗi mạng | Kiểm tra kết nối, đảm bảo `https://ai-gateway.vercel.sh` không bị chặn và bạn còn Internet. |
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

