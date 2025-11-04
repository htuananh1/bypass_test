# Testing Guide

## Manual Scenarios
1. **Load extension**: Load `extension` qua `chrome://extensions` → Developer Mode → Load unpacked. Xác nhận popup hiển thị đúng giao diện kính mờ.
2. **Missing API key**: Mở popup khi chưa nhập key, trạng thái phải báo "Chưa có API key AI Gateway" và nút **Gửi GPT** trả về lỗi.
3. **Enter API key**: Dán key hợp lệ, nhấn **Lưu API key**. Đóng/mở popup lại để chắc chắn trạng thái chuyển sang "Sẵn sàng".
4. **Selection sync**: Bôi đen đoạn văn bất kỳ trên trang, mở popup để kiểm tra ô "Văn bản được bôi đen" tự động điền nội dung. Thử thêm trường hợp chỉ đặt con trỏ trong ô textarea/input (không bôi đen) để xác nhận nội dung vẫn được đọc.
5. **Solve request**: Để chế độ "Giải thích chi tiết", nhấn **Gửi GPT**. Kiểm tra Service Worker log xem request POST tới `https://ai-gateway.vercel.sh/v1/chat/completions` và popup hiển thị kết quả (kèm đoạn mã Python mẫu).
6. **Subject auto-detect**: Chuyển sang chế độ "Chỉ đáp án" và gửi một bài tập thuộc môn khác nhau; xác nhận dòng đầu tiên trả về dạng `Môn học: ...` đúng ngữ cảnh.
7. **Cache hit**: Với cùng câu hỏi, gửi lần hai sau 1–2 giây khi **Bật cache đáp án** đang bật. Status phải báo "Trả lời từ bộ nhớ đệm".
8. **Rate limit**: Tắt cache rồi gửi hai yêu cầu liên tiếp &lt; 5 giây. Status phải cảnh báo giới hạn và không gửi request mới.
9. **Error handling**: Nhập API key sai hoặc tắt mạng để xem thông báo lỗi.
10. **Copy**: Nhấn **Copy** và kiểm tra clipboard đã chứa văn bản trả về.

## Optional Automation
- Bạn có thể viết unit test cho hàm `buildPrompt()` và `hashString()` trong popup bằng Jest (mock `crypto.subtle`), đảm bảo prompt sinh đúng ngôn ngữ/định dạng (bao gồm phần `Môn học:`) và cache key ổn định.
