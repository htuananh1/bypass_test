# Gemini Homework Solver Extension

Một Chrome Extension (Manifest V3) giúp quét trang web để phát hiện câu hỏi và gửi trực tiếp tới Google Gemini nhằm sinh lời giải ngay trong popup. Mọi dữ liệu, bao gồm API key, đều lưu cục bộ trên máy bạn.

## Tính năng chính
- Quét DOM (p/li/div/h1-3/pre/code) để tìm câu hỏi, hỗ trợ nhận diện dấu hỏi, từ khóa (Bài, Câu, MCQ, Question, Problem, Chọn đáp án) và biểu thức LaTeX.
- Gọi trực tiếp Gemini Generative Language API (`generateContent`) từ service worker/popup, không cần proxy.
- Bộ nhớ đệm theo `hash(question + origin)` bằng `chrome.storage.local`, có thể tắt bật trong popup.
- Giới hạn tốc độ: tối thiểu 1 yêu cầu / 5 giây. Hiển thị cảnh báo khi bị giới hạn hoặc lỗi API.
- Giao diện glassmorphism, blob icon SVG động, có hỗ trợ song ngữ Việt/Anh tự động.

## Cài đặt & sử dụng
1. Clone repo này về máy.
2. Mở `chrome://extensions`, bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `extension`.
4. Mở popup của extension, nhập API key Gemini trong ô **API key** (ẩn mặc định, có nút hiển/ẩn).
5. Chọn model (mặc định `gemini-1.5-flash-latest`). Bạn có thể chọn `gemini-2.0-flash` hoặc `gemini-1.5-pro-latest` nếu tài khoản hỗ trợ.
6. Nhấn **Save API key** để lưu vào `chrome.storage.sync`.
7. Nhấn **Scan page** để quét lại trang hiện tại. Danh sách câu hỏi sẽ hiển thị bên dưới cùng nút **Solve** và **Copy**.
8. Chọn câu hỏi cần giải → nhấn **Solve**. Kết quả xuất hiện trong khung **Result** với tab Summary, Steps, Answer, Sources.
9. Nhấn **Copy** để sao chép câu trả lời vào clipboard. Tooltip "Đã copy!" sẽ xuất hiện.

> **Lưu ý bảo mật:** API key chỉ được lưu trong `chrome.storage.sync` của trình duyệt trên máy bạn. Mã nguồn không chứa và không gửi key ra ngoài domain API của Google.

### Biểu tượng extension
- Repository không kèm file `.png` để tránh đưa nhị phân vào pull request. Chrome sẽ dùng biểu tượng mặc định (puzzle) khi không có.
- Nếu bạn cần icon riêng khi phát hành, hãy tạo thủ công hai file `assets/icon48.png` và `assets/icon128.png`, sau đó cập nhật lại trường `icons` trong `manifest.json` trước khi đóng gói.

## Quản lý bộ nhớ đệm & rate limit
- Cache được bật mặc định. Bỏ chọn **Enable cache** nếu muốn luôn gọi API (và bỏ qua giới hạn 5 giây bằng cách đánh dấu "bypassCache" trong payload).
- Các bản ghi cache lưu trong `chrome.storage.local` với tiền tố `cache:`. Để xoá toàn bộ, vào DevTools của extension → tab Application → Storage → xóa mục tương ứng, hoặc chạy `chrome.storage.local.clear()` từ console popup/service worker.
- Khi bị HTTP 429 hoặc giới hạn client (1 request/5 giây), trạng thái hiển thị "Giới hạn tạm thời". Chờ 5 giây rồi thử lại.

## Xử lý sự cố
| Vấn đề | Cách khắc phục |
| --- | --- |
| 401/403 (API key sai/hết hạn) | Kiểm tra lại key trong trang [Google AI Studio](https://aistudio.google.com/). Nhập key mới và lưu lại. |
| 429 (quota hoặc rate limit) | Chờ thêm thời gian, giảm số lần gửi. Popup sẽ báo trạng thái "Giới hạn tạm thời". |
| CORS bị chặn | Gemini API yêu cầu bật quyền trên trang. Nếu popup báo lỗi CORS, mở DevTools → Application → Service Workers → check "Bypass for network" hoặc đảm bảo request thực hiện từ service worker (mặc định extension đã làm). |
| Trang không có câu hỏi | Kiểm tra DOM có chứa câu hỏi dạng text. Bạn có thể copy thủ công câu hỏi và dùng nút Solve với nội dung dán vào input (sắp ra mắt). |
| Mất mạng | Popup hiển thị lỗi mạng, hãy kiểm tra kết nối internet rồi thử lại. |

## Phân quyền
`manifest.json` chỉ yêu cầu:
- `activeTab`, `scripting`, `storage`
- `host_permissions: ["<all_urls>"]`

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

