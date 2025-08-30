/**
 * 安全代理服務 - 防止 API 金鑰洩漏
 * 
 * 安全開發守則：
 *   [x] 預設不信任使用者輸入
 *   [x] 最小權限原則
 *   [x] 關閉偵錯模式
 */
class SafeProxy {
  constructor() {
    this.proxyUrl = '/api/proxy'; // 本地代理端點
    this.allowedTargets = [
      'https://translate.googleapis.com/translate_a/single'
    ];
  }
  
  /**
   * 安全請求翻譯服務
   * @param {string} text - 要翻譯的文本
   * @param {string} targetLang - 目標語言
   * @returns {Promise<string|null>} 翻譯結果
   */
  async translate(text, targetLang = 'zh-TW') {
    try {
      // 安全開發守則：【預設不信任使用者輸入】
      const safeText = window.security.sanitizeInput(text);
      if (!safeText || safeText.length > 2000) {
        throw new Error('INVALID_TEXT');
      }
      
      // 安全開發守則：【最小權限原則】
      const safeTargetLang = this._sanitizeLanguage(targetLang);
      
      // 通過本地代理請求（避免 CORS 和 API 金鑰洩漏）
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': window.security.getCsrfToken()
        },
        body: JSON.stringify({
          target: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${safeTargetLang}&dt=t&q=${encodeURIComponent(safeText)}`,
          method: 'GET'
        }),
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`PROXY_ERROR_${response.status}`);
      }
      
      const result = await response.json();
      return result[0][0][0];
    } catch (e) {
      window.security.logSecurityEvent('TRANSLATION_FAILED', { 
        error: e.message 
      });
      return null;
    }
  }
  
  /**
   * 安全清理語言代碼
   */
  _sanitizeLanguage(lang) {
    const allowedLangs = ['zh-TW', 'en', 'ja', 'ko', 'es'];
    return allowedLangs.includes(lang) ? lang : 'zh-TW';
  }
}

// 全局實例
window.safeProxy = new SafeProxy();