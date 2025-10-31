# Testing Guide

## Manual Scenarios
1. **Load extension**: Load `extension` via `chrome://extensions` → Developer Mode → Load unpacked. Confirm popup renders glass UI with blob icon.
2. **Missing API key**: Open popup, ensure status shows "No API key" / "Chưa có API key" and solve buttons stay disabled after clicking (status remains offline).
3. **Enter API key**: Paste a valid Gemini key, choose model, hit **Save API key**. Status updates to "Ready".
4. **Scan sample page**: Open trang luyện tập có câu hỏi (ví dụ https://math.stackexchange.com). Click **Scan page**, danh sách câu hỏi hiển thị với nút Solve & Copy.
5. **Solve request**: Chọn câu hỏi, nhấn **Solve**. Kiểm tra background console (chrome://extensions → Service Worker) để thấy request gửi tới `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`.
6. **Rate limit**: Gửi hai yêu cầu liên tiếp &lt; 5 giây. Trạng thái phải chuyển sang "Giới hạn tạm thời" và không gửi request mới.
7. **Cache hit**: Sau khi nhận kết quả, nhấn Solve lại sau 5 giây. Popup phải báo "Ready (cached)" và trả kết quả tức thì.
8. **Error handling**: Đổi sang API key sai để thấy thông báo "API key sai". Tắt mạng hoặc dùng DevTools chặn request để xác minh thông báo lỗi mạng.
9. **Copy**: Nhấn **Copy** trong tab Result, đảm bảo clipboard chứa đáp án và tooltip "Đã copy!" hiển thị.
10. **Theme toggle**: Nhấn icon ☀️/🌙 để đổi giao diện dark/light, đóng mở popup vẫn giữ trạng thái (chrome.storage.sync).

## Optional Automation
- Bạn có thể viết unit test cho hàm `extractQuestions()` bằng Jest: import script trong môi trường JSDOM, mock DOM với nhiều phần tử `p/li/div`, và xác nhận chỉ các đoạn chứa dấu hỏi, từ khóa, hoặc LaTeX được chọn.
