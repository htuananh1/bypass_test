# 🤖 Gemini AI Chat - ChatGPT-like Interface

Ứng dụng web chat AI với giao diện giống ChatGPT, chạy trên GitHub Pages, sử dụng Google Gemini 3 Pro API.

## ✨ Tính năng

- 🚀 **Chạy trên GitHub Pages** - Static web app, không cần server
- 🤖 **Google Gemini 3 Pro** - Sử dụng model mới nhất của Google
- 💾 **Lưu dữ liệu** - Lưu lịch sử vào localStorage
- 📥 **Export/Import** - Xuất và nhập dữ liệu dạng JSON
- 📋 **Copy nhanh** - Sao chép kết quả với một click
- 📱 **Responsive** - Hoạt động tốt trên mọi thiết bị
- 🎨 **UI đẹp** - Giao diện hiện đại, dễ sử dụng

## 🚀 Cài đặt và Chạy Local

### 1. Clone repository

```bash
git clone <your-repo-url>
cd gemini-github-pages
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173) trong trình duyệt.

### 4. Build production

```bash
npm run build
```

## 📦 Deploy lên GitHub Pages

### Cách 1: Tự động với GitHub Actions (Khuyến nghị)

1. **Push code lên GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/gemini-github-pages.git
git push -u origin main
```

2. **Bật GitHub Pages:**
   - Vào repository trên GitHub
   - Settings → Pages
   - Source: chọn "GitHub Actions"
   - Workflow sẽ tự động deploy khi push code

3. **Cập nhật base path trong `vite.config.js`:**
   - Nếu repo name là `gemini-github-pages`, giữ nguyên
   - Nếu repo name khác, sửa `base: '/your-repo-name/'`

### Cách 2: Deploy thủ công

1. Build project:
```bash
npm run build
```

2. Push thư mục `dist` lên branch `gh-pages`:
```bash
git subtree push --prefix dist origin gh-pages
```

Hoặc sử dụng [gh-pages](https://www.npmjs.com/package/gh-pages):
```bash
npm install -g gh-pages
gh-pages -d dist
```

## 🔑 Lấy API Key

1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Đăng nhập với tài khoản Google
3. Click "Create API Key"
4. Copy API key và paste vào ứng dụng
5. Click "Lưu" - API key sẽ được lưu cục bộ trong trình duyệt

## 💾 Lưu trữ dữ liệu

- **API Key**: Lưu trong localStorage của trình duyệt
- **Lịch sử**: Lưu tối đa 50 items trong localStorage
- **Export/Import**: Xuất/nhập dữ liệu dạng JSON file

## 📝 Cách sử dụng

1. Nhập Google Gemini API Key và click "Lưu"
2. Nhập prompt/câu hỏi vào ô input
3. Click "Generate" để tạo text
4. Click "💾" để lưu vào lịch sử
5. Click "📥" để xuất dữ liệu
6. Click "📤" để nhập dữ liệu từ file JSON

## 🛠️ Công nghệ

- **Vite** - Build tool
- **Google Generative AI SDK** - Gemini API client
- **Vanilla JavaScript** - Không framework, nhẹ và nhanh
- **CSS3** - Modern styling

## 📄 License

Free to use and modify!

## 🙏 Credits

- Google Gemini AI
- Vite
- GitHub Pages
