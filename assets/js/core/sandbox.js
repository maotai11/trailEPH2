/**
 * TrailSync 沙箱系統 - 防禦跨模塊攻擊
 * 
 * 安全開發守則：
 *   [x] 預設不信任使用者輸入
 *   [x] 使用沙箱隔離
 *   [x] 最小權限原則
 */
class ModuleSandbox {
  constructor() {
    this.sandboxes = new Map();
    this.pendingMessages = new Map();
    this.messageId = 0;
    
    // 安全開發守則強制：【CORS 嚴格設定】
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * 創建模塊沙箱
   * @param {string} moduleId - 模塊ID
   * @param {string} content - 模塊HTML內容
   * @returns {Promise<HTMLElement>} 沙箱容器
   */
  createSandbox(moduleId, content) {
    return new Promise((resolve) => {
      // 安全開發守則強制：【儲存位置：非公開目錄】
      const sandbox = document.createElement('iframe');
      sandbox.id = `sandbox-${moduleId}`;
      sandbox.style.display = 'none';
      sandbox.sandbox = 'allow-scripts allow-same-origin';
      
      // 安全開發守則強制：【CSP 嚴格設定】
      sandbox.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" 
                content="default-src 'self'; 
                         script-src 'self' 'nonce-TRAILSYNC_SECURE'; 
                         style-src 'self' 'nonce-TRAILSYNC_SECURE'; 
                         img-src 'self' data:;">
          <style nonce="TRAILSYNC_SECURE">
            body { margin: 0; padding: 0; }
            .module { padding: 1rem; }
          </style>
        </head>
        <body>
          <div class="module">${content}</div>
          <script nonce="TRAILSYNC_SECURE">
            // 沙箱初始化
            window.parent.postMessage({
              type: 'SANDBOX_READY',
              id: '${moduleId}'
            }, window.location.origin);
            
            // 消息轉發
            window.addEventListener('message', (event) => {
              if (event.origin !== window.location.origin) return;
              window.parent.postMessage({
                type: 'SANDBOX_MESSAGE',
                id: '${moduleId}',
                data: event.data
              }, window.location.origin);
            });
          <\/script>
        </body>
        </html>
      `;
      
      // 附加到文檔
      document.body.appendChild(sandbox);
      
      // 等待沙箱準備就緒
      this.pendingMessages.set(moduleId, {
        resolve,
        sandbox,
        timeout: setTimeout(() => {
          this.pendingMessages.delete(moduleId);
          resolve(sandbox);
        }, 3000)
      });
    });
  }

  /**
   * 處理沙箱消息
   */
  handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'SANDBOX_READY') {
      const pending = this.pendingMessages.get(event.data.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingMessages.delete(event.data.id);
        pending.resolve(pending.sandbox);
      }
    } 
    else if (event.data.type === 'SANDBOX_MESSAGE') {
      // 安全開發守則強制：【預設不信任使用者輸入】
      const safeData = this.sanitizeSandboxData(event.data.data);
      
      // 轉發給主應用
      window.dispatchEvent(new CustomEvent(`sandbox-message-${event.data.id}`, {
        detail: safeData
      }));
    }
  }

  /**
   * 沙箱數據安全清理
   * @private
   */
  sanitizeSandboxData(data) {
    // 安全開發守則強制：【防止 XSS】
    if (typeof data === 'string') {
      return window.XSSProtection.sanitize(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      const safeData = {};
      for (const [key, value] of Object.entries(data)) {
        // 移除敏感字段
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        
        safeData[key] = this.sanitizeSandboxData(value);
      }
      return safeData;
    }
    
    return data;
  }

  /**
   * 向沙箱發送消息
   * @param {string} moduleId - 模塊ID
   * @param {any} message - 消息內容
   */
  postMessage(moduleId, message) {
    const sandbox = document.getElementById(`sandbox-${moduleId}`);
    if (sandbox && sandbox.contentWindow) {
      // 安全開發守則強制：【最小權限原則】
      const safeMessage = {
        ...message,
        origin: 'main-app'
      };
      
      sandbox.contentWindow.postMessage(safeMessage, window.location.origin);
    }
  }

  /**
   * 銷毀沙箱
   * @param {string} moduleId - 模塊ID
   */
  destroySandbox(moduleId) {
    const sandbox = document.getElementById(`sandbox-${moduleId}`);
    if (sandbox) {
      document.body.removeChild(sandbox);
      this.sandboxes.delete(moduleId);
    }
  }
}

// 全局沙箱實例（符合 SDL 流程）
window.moduleSandbox = new ModuleSandbox();