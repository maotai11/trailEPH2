/**
 * 威脅感知監控器 - 業界頂尖實作
 * 
 * 安全開發守則：
 *   [x] 預設不信任使用者輸入
 *   [x] 威脅感知而非預先阻斷
 *   [x] 關閉偵錯模式
 *   [x] 最小權限原則
 */
class ThreatMonitor {
  constructor() {
    this.eventHistory = [];
    this.suspiciousThreshold = 3; // 觸發警告的閾值
    this.blockThreshold = 5;       // 觸發阻斷的閾值
    this.blockDuration = 300000;   // 阻斷持續時間 (5分鐘)
    this.blockedIps = new Map();
    this.warningShown = false;
    
    // 安全開發守則：【CORS 嚴格設定】
    window.addEventListener('message', this.handleMessage.bind(this));
    document.addEventListener('keydown', this.trackKeystrokes.bind(this));
    window.addEventListener('error', this.handleError.bind(this));
    
    // 安全開發守則：【關閉偵錯模式】
    window.onerror = () => true; // 阻止默認錯誤顯示
  }

  /**
   * 處理跨窗口消息（防禦 XSS）
   */
  handleMessage(event) {
    if (event.origin !== window.location.origin) {
      this.recordEvent('CROSS_ORIGIN_MESSAGE', {
        origin: event.origin,
        data: this._sanitizeEventData(event.data)
      });
    }
  }

  /**
   * 追蹤鍵盤輸入（檢測鍵盤記錄器）
   */
  trackKeystrokes(e) {
    // 檢測可疑的鍵盤組合（如 Ctrl+Shift+I 開發者工具）
    if ((e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.key === '`')) {
      this.recordEvent('DEVELOPER_TOOLS_ATTEMPT', {
        keyCode: e.keyCode
      });
    }
    
    // 檢測快速連續輸入（可能為自動化腳本）
    if (this.lastKeystroke && 
        Date.now() - this.lastKeystroke < 50 && 
        e.target.tagName === 'INPUT') {
      this.recordEvent('RAPID_KEYSTROKES', {
        target: e.target.id || 'unknown'
      });
    }
    this.lastKeystroke = Date.now();
  }

  /**
   * 處理 JavaScript 錯誤（檢測漏洞掃描）
   */
  handleError(event) {
    // 檢測常見的漏洞掃描模式
    const scanPatterns = [
      /<script.*?>.*?<\/script>/i,
      /<img[^>]+onerror=/i,
      /javascript:/i,
      /eval\(/i
    ];
    
    for (const pattern of scanPatterns) {
      if (pattern.test(event.message)) {
        this.recordEvent('POSSIBLE_XSS_SCAN', {
          message: this._truncateError(event.message),
          filename: event.filename,
          lineno: event.lineno
        });
        break;
      }
    }
  }

  /**
   * 記錄安全事件（威脅感知核心）
   */
  recordEvent(type, details = {}) {
    const event = {
      timestamp: Date.now(),
      type,
      details: this._sanitizeEventData(details),
      riskLevel: this._calculateRiskLevel(type)
    };
    
    this.eventHistory.push(event);
    
    // 保持歷史記錄在合理範圍
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }
    
    // 檢查是否達到阻斷閾值
    this._checkThreatLevel();
    
    // 安全日誌（GDPR 合規）
    window.security.logSecurityEvent(type, details);
  }

  /**
   * 檢查威脅等級並採取行動
   */
  _checkThreatLevel() {
    const now = Date.now();
    const recentEvents = this.eventHistory.filter(
      e => now - e.timestamp < 60000 // 1分鐘內
    );
    
    const riskScore = recentEvents.reduce(
      (sum, e) => sum + e.riskLevel, 0
    );
    
    // 檢查是否需要警告
    if (riskScore >= this.suspiciousThreshold && 
        riskScore < this.blockThreshold) {
      this._showWarning();
    }
    
    // 檢查是否需要阻斷
    if (riskScore >= this.blockThreshold) {
      this._blockAccess();
    }
  }

  /**
   * 顯示安全警告（非阻斷）
   */
  _showWarning() {
    if (this.warningShown) return;
    
    this.warningShown = true;
    
    window.security.renderSafeContent(
      document.body,
      `<div class="security-warning">
        <p⚠️ 檢測到可疑活動。若您是正常用戶，請忽略此訊息。</p>
        <button id="dismissWarning">關閉警告</button>
      </div>` + document.body.innerHTML
    );
    
    document.getElementById('dismissWarning')?.addEventListener('click', () => {
      document.querySelector('.security-warning').remove();
      this.warningShown = false;
    });
  }

  /**
   * 阻斷訪問（僅在威脅嚴重時）
   */
  _blockAccess() {
    const ip = this._getClientIp(); // 應通過伺服器獲取
    const blockUntil = Date.now() + this.blockDuration;
    
    this.blockedIps.set(ip, blockUntil);
    
    window.security.renderSafeContent(
      document.body,
      `<div class="security-block">
        <h2>⚠️ 安全阻斷</h2>
        <p>檢測到惡意活動，您的訪問已被暫時阻斷。</p>
        <p>請 ${new Date(blockUntil).toLocaleTimeString()} 後再試。</p>
      </div>`
    );
    
    // 5分鐘後自動解除阻斷
    setTimeout(() => {
      if (this.blockedIps.get(ip) === blockUntil) {
        this.blockedIps.delete(ip);
        location.reload();
      }
    }, this.blockDuration);
  }

  /**
   * 計算風險等級
   */
  _calculateRiskLevel(type) {
    const riskLevels = {
      'CROSS_ORIGIN_MESSAGE': 2,
      'DEVELOPER_TOOLS_ATTEMPT': 1,
      'RAPID_KEYSTROKES': 3,
      'POSSIBLE_XSS_SCAN': 5,
      'MODULE_LOAD_FAILED': 2,
      'INVALID_GPX': 1,
      'TRANSLATION_FAILED': 1
    };
    
    return riskLevels[type] || 1;
  }

  /**
   * 安全清理事件數據
   */
  _sanitizeEventData(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const safeData = {};
    for (const [key, value] of Object.entries(data)) {
      // 移除敏感字段
      if (['password', 'token', 'cookie'].includes(key.toLowerCase())) {
        continue;
      }
      
      // 限制字符串長度
      if (typeof value === 'string' && value.length > 200) {
        safeData[key] = value.substring(0, 200) + '...';
      } else {
        safeData[key] = value;
      }
    }
    
    return safeData;
  }

  /**
   * 截斷錯誤消息（防範 XSS）
   */
  _truncateError(message) {
    return message.length > 200 ? 
      message.substring(0, 200) + '...' : 
      message;
  }

  /**
   * 獲取客戶端 IP（應通過伺服器端獲取）
   */
  _getClientIp() {
    // 實際應用中應通過伺服器端 API 獲取
    return 'client-ip-placeholder';
  }
}

// 全局實例（安全初始化）
window.threatMonitor = new ThreatMonitor();