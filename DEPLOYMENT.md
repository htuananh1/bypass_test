# Meo-Bypass Vercel Deployment

This project provides a web API version of the Meo-Bypass functionality for deployment on Vercel, along with a userscript for easy browser integration.

## 🚀 Quick Deployment to Vercel

### Method 1: Deploy from GitHub

1. **Fork this repository** to your GitHub account
2. **Go to [Vercel](https://vercel.com)** and sign in
3. **Click "New Project"**
4. **Import your forked repository**
5. **Configure the project:**
   - Framework Preset: `Other`
   - Build Command: Leave empty
   - Output Directory: Leave empty
6. **Click "Deploy"**

### Method 2: Deploy with Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy the project:**
   ```bash
   vercel
   ```

4. **Follow the prompts** and your app will be deployed!

## 📁 Project Structure

```
/workspace/
├── api.py                 # Main Flask API application
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies
├── meo-bypass-userscript.user.js  # Browser userscript
└── DEPLOYMENT.md         # This file
```

## 🔧 Configuration

### Update API URL in Userscript

After deploying to Vercel, update the API URL in the userscript:

1. Open `meo-bypass-userscript.user.js`
2. Find this line:
   ```javascript
   const API_BASE_URL = 'https://your-app-name.vercel.app';
   ```
3. Replace `your-app-name` with your actual Vercel app URL

### Environment Variables (Optional)

You can set environment variables in Vercel dashboard if needed:
- `FLASK_ENV`: Set to `production` for production deployment

## 🎯 Features

### Web API
- **POST /api/bypass**: Bypass any URL
- **GET /api/status**: Check API status
- **GET /**: Simple web interface

### Userscript Features
- **Auto-detection**: Automatically detects shortener pages
- **Context menu**: Right-click on links to bypass them
- **Keyboard shortcut**: Press `Ctrl+Shift+B` to bypass current page
- **Visual feedback**: Notifications and modal dialogs
- **Clipboard integration**: Automatically copies bypassed URLs

## 🔗 Supported Services

The bypasser supports various short URL services including:
- linkvertise.com
- adf.ly
- exe.io/exey.io
- sub2unlock.net/sub2unlock.com
- rekonise.com
- letsboost.net
- ph.apps2app.com
- mboost.me
- shortconnect.com
- sub4unlock.com
- ytsubme.com
- social-unlock.com
- boost.ink
- bit.ly
- tinyurl.com
- goo.gl
- shrto.ml
- t.co
- And many more...

## 📖 API Usage

### Bypass URL
```bash
curl -X POST https://your-app.vercel.app/api/bypass \
  -H "Content-Type: application/json" \
  -d '{"url": "https://linkvertise.com/12345"}'
```

### Response Format
```json
{
  "success": true,
  "original_url": "https://linkvertise.com/12345",
  "bypassed_url": "https://example.com/final-destination",
  "method": "bypass.vip",
  "website": "linkvertise.com"
}
```

## 🛠️ Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run locally:**
   ```bash
   python api.py
   ```

3. **Test the API:**
   ```bash
   curl -X POST http://localhost:5000/api/bypass \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

## 🔒 Security Notes

- The API is designed to be public and doesn't require authentication
- Rate limiting is not implemented by default (consider adding if needed)
- All bypassed URLs are logged for debugging purposes
- The API respects robots.txt and doesn't bypass URLs that shouldn't be bypassed

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors:**
   - Make sure all dependencies are in `requirements.txt`
   - Check that the Python version is compatible

2. **API not responding:**
   - Check Vercel function logs
   - Verify the `vercel.json` configuration

3. **Userscript not working:**
   - Make sure the API URL is correct
   - Check browser console for errors
   - Ensure the userscript manager is installed (Tampermonkey/Greasemonkey)

### Debug Mode

To enable debug mode locally:
```bash
export FLASK_DEBUG=1
python api.py
```

## 📝 License

This project is based on the original Meo-Bypass Python code and is provided as-is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review Vercel function logs
3. Open an issue on GitHub

---

**Happy Bypassing! 🔗✨**