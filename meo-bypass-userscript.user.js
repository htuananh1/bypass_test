// ==UserScript==
// @name         Meo-Bypass Userscript
// @namespace    https://github.com/longndev/Meo-Bypass
// @version      1.0.0
// @description  Universal link bypasser for various short URL services
// @author       Meo-Bypass Team
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration - Update this URL to your deployed Vercel app
    const API_BASE_URL = 'https://your-app-name.vercel.app';
    
    // List of known shortener domains
    const SHORTENER_DOMAINS = [
        'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.ly',
        'linkvertise.com', 'adf.ly', 'exe.io', 'exey.io',
        'sub2unlock.net', 'sub2unlock.com', 'rekonise.com',
        'letsboost.net', 'ph.apps2app.com', 'mboost.me',
        'shortconnect.com', 'sub4unlock.com', 'ytsubme.com',
        'social-unlock.com', 'boost.ink', 'shrto.ml',
        'shorturl.at', 'cutt.ly', 'is.gd', 'v.gd', 'ow.ly'
    ];
    
    // Create bypass button
    function createBypassButton() {
        const button = document.createElement('button');
        button.innerHTML = '🔗 Bypass';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('mouseenter', function() {
            this.style.background = '#0056b3';
            this.style.transform = 'scale(1.05)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.background = '#007bff';
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('click', function() {
            bypassCurrentPage();
        });
        
        return button;
    }
    
    // Check if current page is a shortener
    function isShortenerPage() {
        const hostname = window.location.hostname.toLowerCase();
        return SHORTENER_DOMAINS.some(domain => hostname.includes(domain));
    }
    
    // Bypass current page URL
    function bypassCurrentPage() {
        const currentUrl = window.location.href;
        showNotification('Bypassing URL...', 'info');
        
        bypassUrl(currentUrl)
            .then(result => {
                if (result.success) {
                    showNotification('URL bypassed successfully!', 'success');
                    copyToClipboard(result.bypassed_url);
                    showBypassResult(result);
                } else {
                    showNotification('Failed to bypass URL: ' + result.error, 'error');
                }
            })
            .catch(error => {
                showNotification('Error: ' + error.message, 'error');
            });
    }
    
    // Bypass any URL
    function bypassUrl(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${API_BASE_URL}/api/bypass`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ url: url }),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(new Error('Invalid response from server'));
                    }
                },
                onerror: function(error) {
                    reject(new Error('Network error: ' + error.message));
                }
            });
        });
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
        } else {
            navigator.clipboard.writeText(text).then(() => {
                console.log('URL copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy to clipboard:', err);
            });
        }
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        if (typeof GM_notification !== 'undefined') {
            GM_notification({
                text: message,
                title: 'Meo-Bypass',
                timeout: 3000
            });
        } else {
            // Fallback to console
            console.log(`[Meo-Bypass] ${message}`);
        }
    }
    
    // Show bypass result in a modal
    function showBypassResult(result) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #28a745;">✅ Bypass Successful!</h2>
            <div style="margin: 20px 0;">
                <h3>Original URL:</h3>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">${result.original_url}</p>
            </div>
            <div style="margin: 20px 0;">
                <h3>Bypassed URL:</h3>
                <p style="word-break: break-all; background: #e7f3ff; padding: 10px; border-radius: 5px;">${result.bypassed_url}</p>
            </div>
            <div style="margin: 20px 0;">
                <p><strong>Method:</strong> ${result.method}</p>
                <p><strong>Website:</strong> ${result.website}</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button id="copyBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Copy Bypassed URL</button>
                <button id="openBtn" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Open Bypassed URL</button>
                <button id="closeBtn" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listeners
        document.getElementById('copyBtn').addEventListener('click', function() {
            copyToClipboard(result.bypassed_url);
            showNotification('Bypassed URL copied to clipboard!', 'success');
        });
        
        document.getElementById('openBtn').addEventListener('click', function() {
            window.open(result.bypassed_url, '_blank');
            modal.remove();
        });
        
        document.getElementById('closeBtn').addEventListener('click', function() {
            modal.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Add context menu for links
    function addContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
                const url = new URL(link.href);
                if (SHORTENER_DOMAINS.some(domain => url.hostname.includes(domain))) {
                    // Add bypass option to context menu
                    const menu = document.createElement('div');
                    menu.style.cssText = `
                        position: fixed;
                        top: ${e.pageY}px;
                        left: ${e.pageX}px;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        z-index: 10000;
                        padding: 5px 0;
                    `;
                    
                    const bypassOption = document.createElement('div');
                    bypassOption.innerHTML = '🔗 Bypass this link';
                    bypassOption.style.cssText = `
                        padding: 8px 15px;
                        cursor: pointer;
                        font-size: 14px;
                    `;
                    bypassOption.addEventListener('mouseenter', function() {
                        this.style.background = '#f8f9fa';
                    });
                    bypassOption.addEventListener('mouseleave', function() {
                        this.style.background = 'white';
                    });
                    bypassOption.addEventListener('click', function() {
                        bypassUrl(link.href).then(result => {
                            if (result.success) {
                                showNotification('Link bypassed! Opening...', 'success');
                                window.open(result.bypassed_url, '_blank');
                            } else {
                                showNotification('Failed to bypass link', 'error');
                            }
                        });
                        menu.remove();
                    });
                    
                    menu.appendChild(bypassOption);
                    document.body.appendChild(menu);
                    
                    // Remove menu when clicking elsewhere
                    setTimeout(() => {
                        document.addEventListener('click', function removeMenu() {
                            menu.remove();
                            document.removeEventListener('click', removeMenu);
                        });
                    }, 100);
                }
            }
        });
    }
    
    // Initialize the userscript
    function init() {
        // Add bypass button if on a shortener page
        if (isShortenerPage()) {
            const button = createBypassButton();
            document.body.appendChild(button);
        }
        
        // Add context menu functionality
        addContextMenu();
        
        // Add keyboard shortcut (Ctrl+Shift+B)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'B') {
                e.preventDefault();
                bypassCurrentPage();
            }
        });
        
        console.log('Meo-Bypass Userscript loaded successfully!');
        console.log('Press Ctrl+Shift+B to bypass current page');
    }
    
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();