/**
 * XSS 防禦工具集 - 符合 OWASP XSS Prevention Cheat Sheet
 * 
 * 安全開發守則：
 *   [x] 防止 XSS
 *   [x] 預設不信任使用者輸入
 */
const XSSProtection = {
  /**
   * HTML 實體編碼（輸出編碼）
   * @param {string} str - 原始字符串
   * @returns {string} 安全字符串
   */
  sanitize: function(str) {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;');
  },

  /**
   * 安全插入 HTML（白名單過濾）
   * @param {HTMLElement} element - 目標元素
   * @param {string} html - 用戶提供的 HTML
   */
  safeInsertHtml: function(element, html) {
    element.textContent = ''; // 清空
    
    // 安全處理步驟
    const safeHtml = this.sanitize(html);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = safeHtml;
    
    // 白名單標籤（符合越野跑場景）
    const allowedTags = ['b', 'strong', 'i', 'em', 'br', 'span', 'small', 'sup', 'sub'];
    const fragment = document.createDocumentFragment();
    
    Array.from(tempDiv.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        fragment.appendChild(document.createTextNode(node.textContent));
      } else if (allowedTags.includes(node.tagName.toLowerCase())) {
        const safeNode = document.createElement(node.tagName);
        // 複製安全屬性
        Array.from(node.attributes).forEach(attr => {
          if (['class', 'style'].includes(attr.name)) {
            safeNode.setAttribute(attr.name, this.sanitize(attr.value));
          }
        });
        safeNode.innerHTML = node.innerHTML;
        fragment.appendChild(safeNode);
      }
    });
    
    element.appendChild(fragment);
  },

  /**
   * 安全生成分享圖像（Canvas 方案）
   * @param {Object} data - 分享數據
   * @returns {string} data URL
   */
  generateShareImage: function(data) {
    // 過濦所有輸入
    const safeData = {
      route: this.sanitize(data.route || '未命名路線'),
      eph: parseFloat(data.eph).toFixed(2),
      date: new Date().toISOString().split('T')[0]
    };
    
    // 使用 Canvas 生成 PNG（無 SVG 漏洞）
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // 安全背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 路徑邊框
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 760, 360);
    
    // 標題
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillStyle = '#1976D2';
    ctx.fillText('TrailSync 分享報告', 50, 50);
    
    // 路線信息
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText(`路線: ${safeData.route}`, 50, 100);
    ctx.fillText(`EPH: ${safeData.eph}`, 50, 140);
    ctx.fillText(`日期: ${safeData.date}`, 50, 180);
    
    // 添加 TrailSync 標誌（安全方式）
    const logo = new Image();
    logo.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgYy8+PC9zdmc+';
    logo.onload = () => {
      ctx.drawImage(logo, 650, 320, 100, 40);
    };
    
    return canvas.toDataURL('image/png');
  },

  /**
   * 安全解析 URL 參數
   * @param {string} param - 參數名
   * @returns {string|null}
   */
  getSafeQueryParam: function(param) {
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(param);
    return value ? this.sanitize(value) : null;
  }
};

// 全局可用（符合 SDL 流程）
window.XSSProtection = XSSProtection;