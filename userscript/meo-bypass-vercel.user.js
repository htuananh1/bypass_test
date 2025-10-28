// ==UserScript==
// @name         Mèo Bypass (Vercel client)
// @namespace    longndev.meo-bypass.vercel
// @version      0.1.0
// @description  Gửi link đến API Vercel để bypass và nhận link đích
// @author       you
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
  'use strict';

  // TODO: Set your deployed Vercel URL here
  const API_BASE = localStorage.getItem('meo_bypass_api') || 'https://YOUR-VERCEL-APP.vercel.app';

  function notify(msg) {
    if (window.GM_notification) {
      window.GM_notification({text: msg, title: 'Mèo Bypass'});
    } else {
      console.log('[Mèo Bypass]', msg);
    }
  }

  async function callBypass(url) {
    const endpoint = API_BASE.replace(/\/$/, '') + '/api/bypass';
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: endpoint,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ url, user_agent: navigator.userAgent }),
        onload: function(resp) {
          try {
            const data = JSON.parse(resp.responseText);
            if (data.ok && data.target) resolve(data.target);
            else reject(data);
          } catch(err) { reject(err); }
        },
        onerror: reject,
        ontimeout: reject,
        timeout: 15000
      });
    });
  }

  function isShortlink(u) {
    // Seed: Vietnamese shortlink hosts from README; customize as needed
    const hosts = [
      'linktot.co', 'xlink.vn', 'synurl.com', 'bbmkts.com', 'linkngon.com',
      'trafficuser.net', 'traffichay.com', 'trafficseotop.com', 'trafficviet.net',
      'traffichub.net', 'seotimtim.com'
    ];
    try {
      const h = new URL(u).hostname.replace(/^www\./, '');
      return hosts.some(x => h === x || h.endsWith('.' + x));
    } catch { return false; }
  }

  async function maybeBypass(currentUrl) {
    if (!isShortlink(currentUrl)) return;
    try {
      notify('Đang gửi link tới API bypass...');
      const target = await callBypass(currentUrl);
      if (target && target !== currentUrl) {
        notify('Đã bypass, chuyển hướng...');
        window.location.replace(target);
      } else {
        notify('Không tìm được link đích');
      }
    } catch (e) {
      notify('Bypass thất bại: ' + (e && e.error || e?.message || e));
    }
  }

  // Run on navigation
  maybeBypass(location.href);
})();
