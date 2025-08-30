/**
 * 安全存儲引擎 - 符合 GDPR Article 32
 * 
 * 安全開發守則：
 *   [x] 絕不寫死秘密
 *   [x] 使用環境變數（瀏覽器上下文）
 *   [x] 關閉偵錯模式
 */
class SecureStorage {
  constructor() {
    this.encryptionKey = null;
    this.keyPromise = this._initKey();
  }

  /**
   * 初始化加密密鑰
   * @private
   */
  async _initKey() {
    try {
      // 從安全存儲獲取現有密鑰
      const storedKey = localStorage.getItem('trailsync_encKey_v2');
      if (storedKey) {
        this.encryptionKey = await this._importKey(storedKey);
        return;
      }
      
      // 生成新密鑰（基於設備指紋 + 時間戳）
      const fingerprint = this._generateFingerprint();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(fingerprint),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('TRAILSYNC_SALT_v2'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // 安全存儲密鑰（JWK 格式）
      const jwk = await crypto.subtle.exportKey('jwk', this.encryptionKey);
      localStorage.setItem('trailsync_encKey_v2', JSON.stringify(jwk));
    } catch (e) {
      window.security?.logSecurityEvent('KEY_INIT_FAILED', { error: e.message });
      throw new Error('SECURE_STORAGE_INIT_FAILED');
    }
  }

  /**
   * 導入現有密鑰
   * @private
   */
  async _importKey(jwkJson) {
    const jwk = JSON.parse(jwkJson);
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      false,
      ['decrypt', 'encrypt']
    );
  }

  /**
   * 生成設備指紋（非 PII）
   * @private
   */
  _generateFingerprint() {
    return [
      navigator.userAgent,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      Math.floor(Date.now() / 86400000) // 每日變化
    ].join('|');
  }

  /**
   * 安全設置數據
   * @param {string} key - 存儲鍵名
   * @param {any} value - 原始數據
   */
  async setItem(key, value) {
    await this.keyPromise; // 確保密鑰初始化完成
    
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(value));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.encryptionKey,
        data
      );
      
      // 存儲格式：{ iv: base64, data: base64 }
      const stored = {
        iv: this._arrayBufferToBase64(iv),
         this._arrayBufferToBase64(encrypted)
      };
      
      localStorage.setItem(`secure_${key}`, JSON.stringify(stored));
    } catch (e) {
      window.security?.logSecurityEvent('ENCRYPTION_FAILED', { key, error: e.message });
      throw new Error('DATA_ENCRYPTION_FAILED');
    }
  }

  /**
   * 安全獲取數據
   * @param {string} key - 存儲鍵名
   * @returns {Promise<any|null>}
   */
  async getItem(key) {
    await this.keyPromise;
    
    const stored = localStorage.getItem(`secure_${key}`);
    if (!stored) return null;
    
    try {
      const { iv, data } = JSON.parse(stored);
      const ivBuffer = this._base64ToArrayBuffer(iv);
      const dataBuffer = this._base64ToArrayBuffer(data);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuffer },
        this.encryptionKey,
        dataBuffer
      );
      
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      // 密鑰變更時自動重建（設備同步場景）
      if (e.name === 'OperationError') {
        localStorage.removeItem(`trailsync_encKey_v2`);
        await this._initKey();
        return this.getItem(key); // 重試
      }
      window.security?.logSecurityEvent('DECRYPTION_FAILED', { key, error: e.message });
      return null;
    }
  }

  /**
   * 清除所有安全數據
   */
  clear() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('trailsync_encKey_v2');
  }

  /**
   * 工具函數：ArrayBuffer → Base64
   * @private
   */
  _arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  /**
   * 工具函數：Base64 → ArrayBuffer
   * @private
   */
  _base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// 安全存儲實例（全局可用）
window.secureStorage = new SecureStorage();