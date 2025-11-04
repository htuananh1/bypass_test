# Testing Guide

## Manual Scenarios
1. **Load extension**: Load `extension` qua `chrome://extensions` → Developer Mode → Load unpacked. Xác nhận popup hiển thị đúng giao diện kính mờ.
2. **Missing API key**: Mở popup khi chưa nhập key, trạng thái phải báo "Chưa có API key" và nút **Gửi Gemini** trả về lỗi.
3. **Enter API key**: Dán key hợp lệ, nhấn **Lưu API key**. Đóng/mở popup lại để chắc chắn trạng thái chuyển sang "Sẵn sàng".
4. **Selection sync**: Bôi đen đoạn văn bất kỳ trên trang, mở popup để kiểm tra ô "Văn bản được bôi đen" tự động điền nội dung.
5. **Solve request**: Để chế độ "Giải thích chi tiết", nhấn **Gửi Gemini**. Kiểm tra Service Worker log xem request tới `https://generativelanguage.googleapis.com/...:generateContent` và popup hiển thị kết quả.
6. **Cache hit**: Với cùng câu hỏi, gửi lần hai sau 1–2 giây khi **Bật cache đáp án** đang bật. Status phải báo "Trả lời từ bộ nhớ đệm".
7. **Rate limit**: Tắt cache rồi gửi hai yêu cầu liên tiếp &lt; 5 giây. Status phải cảnh báo giới hạn và không gửi request mới.
8. **Error handling**: Nhập API key sai hoặc tắt mạng để xem thông báo lỗi.
9. **Copy**: Nhấn **Copy** và kiểm tra clipboard đã chứa văn bản trả về.

## Optional Automation
- Bạn có thể viết unit test cho hàm `buildPrompt()` và `hashString()` trong popup bằng Jest (mock `crypto.subtle`), đảm bảo prompt sinh đúng ngôn ngữ/định dạng và cache key ổn định.
