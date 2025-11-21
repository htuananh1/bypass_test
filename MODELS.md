# 🤖 Danh sách Model Gemini

## Model hiện tại

Ứng dụng đang sử dụng: **`gemini-3-pro-preview`**

## Các model khả dụng

Nếu model `gemini-3-pro-preview` không hoạt động, bạn có thể thay đổi trong file `src/main.js`:

### 1. Gemini 3 (Mới nhất)
- `gemini-3-pro-preview` - Model preview mới nhất
- `gemini-2.0-flash-exp` - Experimental version

### 2. Gemini 1.5
- `gemini-1.5-pro` - Model mạnh nhất, chậm hơn
- `gemini-1.5-flash` - Model nhanh, phù hợp cho chat

### 3. Gemini 1.0
- `gemini-pro` - Model cơ bản

## Cách thay đổi model

Mở file `src/main.js` và tìm dòng:

```javascript
model: 'gemini-3-pro-preview'
```

Thay đổi thành model bạn muốn, ví dụ:

```javascript
model: 'gemini-1.5-flash'
```

Sau đó build lại:

```bash
npm run build
```

## So sánh model

| Model | Tốc độ | Chất lượng | Use case |
|-------|--------|------------|----------|
| gemini-3-pro-preview | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Text generation, complex tasks |
| gemini-1.5-pro | ⭐⭐ | ⭐⭐⭐⭐⭐ | Complex reasoning, long context |
| gemini-1.5-flash | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Fast responses, chat |
| gemini-pro | ⭐⭐⭐ | ⭐⭐⭐ | General purpose |

## Lưu ý

- Model preview có thể không luôn khả dụng
- Một số model có thể yêu cầu API key với quyền truy cập đặc biệt
- Kiểm tra [Google AI Studio](https://aistudio.google.com) để xem model nào đang khả dụng
