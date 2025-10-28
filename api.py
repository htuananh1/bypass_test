from flask import Flask, request, jsonify, render_template
import requests
import json
import re
from urllib.parse import urlparse, parse_qs
import time

app = Flask(__name__)

# Meo-Bypass functionality adapted for web API
def bypass_url(url):
    """
    Bypass various short URL services using multiple techniques
    """
    try:
        # First try the bypass.vip API (similar to the C# version)
        bypass_vip_result = try_bypass_vip(url)
        if bypass_vip_result and bypass_vip_result.get('success'):
            return {
                'success': True,
                'original_url': url,
                'bypassed_url': bypass_vip_result.get('destination'),
                'method': 'bypass.vip',
                'website': bypass_vip_result.get('website', 'Unknown')
            }
        
        # Try direct bypass methods
        direct_result = try_direct_bypass(url)
        if direct_result:
            return {
                'success': True,
                'original_url': url,
                'bypassed_url': direct_result,
                'method': 'direct',
                'website': 'Direct bypass'
            }
        
        # Try other bypass methods
        other_result = try_other_bypass_methods(url)
        if other_result:
            return {
                'success': True,
                'original_url': url,
                'bypassed_url': other_result,
                'method': 'other',
                'website': 'Other method'
            }
        
        return {
            'success': False,
            'error': 'Unable to bypass this URL',
            'original_url': url
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'original_url': url
        }

def try_bypass_vip(url):
    """Try using bypass.vip API"""
    try:
        response = requests.post('https://api.bypass.vip/', 
                               data={'url': url}, 
                               timeout=10)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return None

def try_direct_bypass(url):
    """Try direct bypass methods"""
    try:
        # Follow redirects and get final URL
        response = requests.get(url, allow_redirects=True, timeout=10)
        final_url = response.url
        
        # If the final URL is different from the original, it might be bypassed
        if final_url != url and not is_shortener_url(final_url):
            return final_url
    except:
        pass
    return None

def try_other_bypass_methods(url):
    """Try other bypass methods"""
    try:
        # Add common bypass parameters
        bypass_params = [
            '?bypass=1',
            '?skip=1',
            '?direct=1',
            '?noredirect=1'
        ]
        
        for param in bypass_params:
            try:
                test_url = url + param
                response = requests.get(test_url, allow_redirects=True, timeout=5)
                if response.url != test_url and not is_shortener_url(response.url):
                    return response.url
            except:
                continue
    except:
        pass
    return None

def is_shortener_url(url):
    """Check if URL is from a known shortener service"""
    shorteners = [
        'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.ly',
        'linkvertise.com', 'adf.ly', 'exe.io', 'exey.io',
        'sub2unlock.net', 'sub2unlock.com', 'rekonise.com',
        'letsboost.net', 'ph.apps2app.com', 'mboost.me',
        'shortconnect.com', 'sub4unlock.com', 'ytsubme.com',
        'social-unlock.com', 'boost.ink', 'shrto.ml'
    ]
    
    domain = urlparse(url).netloc.lower()
    return any(shortener in domain for shortener in shorteners)

@app.route('/')
def index():
    """Main page with simple interface"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Meo-Bypass API</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 10px; }
            input[type="text"] { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .url { word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 Meo-Bypass API</h1>
            <p>Universal link bypasser for various short URL services</p>
            
            <form id="bypassForm">
                <input type="text" id="urlInput" placeholder="Enter URL to bypass..." required>
                <button type="submit">Bypass URL</button>
            </form>
            
            <div id="result"></div>
            
            <h3>API Usage:</h3>
            <p><strong>POST /api/bypass</strong></p>
            <p>Body: <code>{"url": "your_url_here"}</code></p>
            <p>Response: JSON with bypassed URL or error message</p>
        </div>
        
        <script>
            document.getElementById('bypassForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const url = document.getElementById('urlInput').value;
                const resultDiv = document.getElementById('result');
                
                resultDiv.innerHTML = '<p>Bypassing...</p>';
                
                try {
                    const response = await fetch('/api/bypass', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: url })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        resultDiv.innerHTML = `
                            <div class="result success">
                                <h3>✅ Success!</h3>
                                <p><strong>Original:</strong> <span class="url">${data.original_url}</span></p>
                                <p><strong>Bypassed:</strong> <span class="url">${data.bypassed_url}</span></p>
                                <p><strong>Method:</strong> ${data.method}</p>
                                <p><strong>Website:</strong> ${data.website}</p>
                                <button onclick="copyToClipboard('${data.bypassed_url}')">Copy Bypassed URL</button>
                            </div>
                        `;
                    } else {
                        resultDiv.innerHTML = `
                            <div class="result error">
                                <h3>❌ Error</h3>
                                <p>${data.error}</p>
                            </div>
                        `;
                    }
                } catch (error) {
                    resultDiv.innerHTML = `
                        <div class="result error">
                            <h3>❌ Error</h3>
                            <p>Network error: ${error.message}</p>
                        </div>
                    `;
                }
            });
            
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(function() {
                    alert('URL copied to clipboard!');
                });
            }
        </script>
    </body>
    </html>
    '''

@app.route('/api/bypass', methods=['POST'])
def api_bypass():
    """API endpoint for bypassing URLs"""
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({'success': False, 'error': 'URL parameter is required'}), 400
        
        url = data['url'].strip()
        if not url:
            return jsonify({'success': False, 'error': 'URL cannot be empty'}), 400
        
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        result = bypass_url(url)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'status': 'online',
        'service': 'Meo-Bypass API',
        'version': '1.0.0',
        'timestamp': int(time.time())
    })

if __name__ == '__main__':
    app.run(debug=True)