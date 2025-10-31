# Gemini Study Solver Extension

Tiện ích Chrome Manifest V3 giúp giải bài tập bằng Google Gemini với prompt tối ưu và hỗ trợ đặc biệt cho nền tảng Orion.

## Tính năng chính
- Popup giao diện mới dạng thẻ, hỗ trợ quét đề bài trực tiếp từ trang web và sao chép đáp án nhanh.
- Prompt builder chuẩn hóa với hai chế độ: chung và tối ưu Orion.
- Điều chỉnh temperature, top P, giới hạn token ngay trong popup, lưu cấu hình tức thời.
- Gửi yêu cầu tới Gemini (mặc định `gemini-2.5-flash`) bằng lớp `GoogleGenAI` tương thích snippet chính thức.
- Context menu và content script hiển thị panel lời giải đẹp mắt, kèm nút sao chép.
- Trang cấu hình riêng để quản lý API key, chọn mô hình Gemini và chỉnh sửa template prompt.

## Hướng dẫn cài đặt
1. Lấy API key Gemini tại [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Mở Chrome → `chrome://extensions` → bật *Developer mode*.
3. Chọn **Load unpacked** và trỏ tới thư mục `extension/`.
4. Mở tùy chọn tiện ích để nhập API key, chọn mô hình và điều chỉnh template theo nhu cầu.

## Cấu trúc thư mục
```
extension/
  manifest.json
  src/
    background.js
    contentScript.js
    popup.html
    popup.js
    popup.css
    options.html
    options.js
    options.css
    promptBuilder.js
```

> **Lưu ý:** Thêm thủ công biểu tượng PNG 128×128 vào `extension/src/` nếu bạn cần icon hiển thị trên Chrome Web Store hoặc thanh tiện ích.

## Lưu ý bảo mật
- API key được lưu trong `chrome.storage.sync` của trình duyệt; hãy bảo vệ tài khoản Google và xoá key nếu không sử dụng.
- Gemini yêu cầu cài đặt hạn mức; cân nhắc giới hạn token và temperature để tiết kiệm chi phí.

## Phát triển thêm
- Bổ sung thêm preset cho các bộ môn khác nhau (Toán, Vật lý...).
- Tích hợp markdown renderer để hiển thị lời giải trực quan hơn ngay trong popup hoặc panel.
- Đồng bộ hoá template theo tài khoản thông qua nền tảng Orion nếu API cho phép.
